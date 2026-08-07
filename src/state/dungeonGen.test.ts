import { describe, expect, it } from "vitest";
import { dungeons } from "../data/config";
import type { DungeonState } from "../types";
import { generateDungeon } from "./dungeonGen";

/** 固定种子 LCG：确定性且序列多样（固定数组会退化为常数流，让生长生成走向退化） */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const forest = dungeons.forest;

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** 统计房间数与墙格数 */
function countRooms(d: DungeonState): number {
  let n = 0;
  for (const row of d.rooms) for (const r of row) if (r) n++;
  return n;
}

/** 从入口 BFS 可到达的房间数 */
function reachableCount(d: DungeonState): number {
  const seen = new Set([`${d.playerPos.x},${d.playerPos.y}`]);
  const queue = [{ ...d.playerPos }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const dir of DIRS) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      if (nx < 0 || ny < 0 || nx >= d.size.w || ny >= d.size.h) continue;
      if (!d.rooms[ny][nx] || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen.size;
}

/** 房间度数（相邻已有房间数） */
function degreeOf(d: DungeonState, x: number, y: number): number {
  let n = 0;
  for (const dir of DIRS) {
    const nx = x + dir.x;
    const ny = y + dir.y;
    if (nx >= 0 && ny >= 0 && nx < d.size.w && ny < d.size.h && d.rooms[ny][nx]) n++;
  }
  return n;
}

/** 必经房间：去掉该房间后仍有房间与入口失联 */
function articulationPoints(d: DungeonState): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < d.size.h; y++) {
    for (let x = 0; x < d.size.w; x++) {
      if (!d.rooms[y][x]) continue;
      if (x === d.playerPos.x && y === d.playerPos.y) continue;
      if (d.rooms[y][x]!.type === "boss") continue;
      // 临时移除该房间后检查全连通性
      const saved = d.rooms[y][x];
      d.rooms[y][x] = null;
      if (reachableCount(d) < countRooms(d)) out.push({ x, y });
      d.rooms[y][x] = saved;
    }
  }
  return out;
}

describe("generateDungeon（以撒式稀疏生成）", () => {
  it("尺寸与入口正确：居中、已探索、无敌人/物品", () => {
    const d = generateDungeon(forest, seeded(42));
    expect(d.size).toEqual({ w: 15, h: 15 });
    expect(d.playerPos).toEqual({ x: 7, y: 7 });
    const entrance = d.rooms[7][7]!;
    expect(entrance.type).toBe("entrance");
    expect(entrance.explored).toBe(true);
    expect(entrance.enemyIds).toEqual([]);
    expect(entrance.itemIds).toEqual([]);
  });

  it("稀疏：存在墙格（null），房间数在目标附近", () => {
    const d = generateDungeon(forest, seeded(42));
    let nulls = 0;
    for (const row of d.rooms) for (const r of row) if (!r) nulls++;
    expect(nulls).toBeGreaterThan(0);
    const n = countRooms(d);
    expect(n).toBeGreaterThanOrEqual(forest.roomCount - 3);
    expect(n).toBeLessThanOrEqual(forest.roomCount + 10);
  });

  it("全连通：所有房间可从入口到达", () => {
    const d = generateDungeon(forest, seeded(42));
    expect(reachableCount(d)).toBe(countRooms(d));
  });

  it("Boss 唯一、BFS 最深、携带 Boss 敌人", () => {
    const d = generateDungeon(forest, seeded(42));
    const bossRooms: { x: number; y: number }[] = [];
    let maxDepth = 0;
    for (let y = 0; y < d.size.h; y++) {
      for (let x = 0; x < d.size.w; x++) {
        const r = d.rooms[y][x];
        if (!r) continue;
        maxDepth = Math.max(maxDepth, r.depth);
        if (r.type === "boss") bossRooms.push({ x, y });
      }
    }
    expect(bossRooms).toHaveLength(1);
    expect(maxDepth).toBeGreaterThan(0);
    expect(d.rooms[bossRooms[0].y][bossRooms[0].x]!.depth).toBe(maxDepth);
    expect(d.rooms[bossRooms[0].y][bossRooms[0].x]!.enemyIds).toContain("goblin_king");
  });

  it("必经房间：至少存在一个割点（去之则部分房间失联）", () => {
    const d = generateDungeon(forest, seeded(42));
    expect(articulationPoints(d).length).toBeGreaterThanOrEqual(1);
  });

  it("多分支：存在度数 ≥3 的房间", () => {
    const d = generateDungeon(forest, seeded(42));
    let branched = 0;
    for (let y = 0; y < d.size.h; y++) {
      for (let x = 0; x < d.size.w; x++) {
        if (d.rooms[y][x] && degreeOf(d, x, y) >= 3) branched++;
      }
    }
    expect(branched).toBeGreaterThanOrEqual(1);
  });

  it("敌人深度在归一化区间内（goblin_brute 只出现在深层）", () => {
    const d = generateDungeon(forest, seeded(7));
    const bossDepth = Math.max(
      ...d.rooms.flat().filter((r): r is NonNullable<typeof r> => !!r).map((r) => r.depth)
    );
    for (let y = 0; y < d.size.h; y++) {
      for (let x = 0; x < d.size.w; x++) {
        const r = d.rooms[y][x];
        if (!r || r.type !== "normal") continue;
        const norm = Math.floor((r.depth * 10) / bossDepth);
        for (const id of r.enemyIds) {
          const pool = forest.enemyPool.find((e) => e.enemyId === id)!;
          expect(norm, `${id} @ norm ${norm}`).toBeGreaterThanOrEqual(pool.minDepth);
          expect(norm, `${id} @ norm ${norm}`).toBeLessThanOrEqual(pool.maxDepth);
        }
      }
    }
  });

  it("物品全部来自物品池", () => {
    const d = generateDungeon(forest, seeded(42));
    for (const row of d.rooms) {
      for (const r of row) {
        if (!r) continue;
        for (const id of r.itemIds) {
          expect(forest.itemPool).toContain(id);
        }
      }
    }
  });
});
