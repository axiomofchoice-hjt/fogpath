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

/** 重新 BFS 计算的深度矩阵（用于与存储的 depth 一致性校验） */
function bfsDepths(d: DungeonState): number[][] {
  const out = Array.from({ length: d.size.h }, () =>
    Array.from({ length: d.size.w }, () => -1)
  );
  out[d.playerPos.y][d.playerPos.x] = 0;
  const queue = [{ x: d.playerPos.x, y: d.playerPos.y }];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const dir of DIRS) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      if (nx < 0 || ny < 0 || nx >= d.size.w || ny >= d.size.h) continue;
      if (!d.rooms[ny][nx] || out[ny][nx] !== -1) continue;
      out[ny][nx] = out[cur.y][cur.x] + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return out;
}

/** 汇总结构指标：房间数、三岔数、最深深度、Boss 位置 */
function metrics(d: DungeonState): {
  count: number;
  branched: number;
  maxDepth: number;
  boss: { x: number; y: number } | null;
} {
  let count = 0;
  let branched = 0;
  let maxDepth = 0;
  let boss: { x: number; y: number } | null = null;
  for (let y = 0; y < d.size.h; y++) {
    for (let x = 0; x < d.size.w; x++) {
      const r = d.rooms[y][x];
      if (!r) continue;
      count++;
      maxDepth = Math.max(maxDepth, r.depth);
      if (r.type === "boss") boss = { x, y };
      if (degreeOf(d, x, y) >= 3) branched++;
    }
  }
  return { count, branched, maxDepth, boss };
}

describe("generateDungeon（静态手编布局：哥布林营地）", () => {
  const camp = dungeons.goblin_camp;

  it("按 layout 构建：8 房纯线、入口已探索、Boss 房在最深处", () => {
    const d = generateDungeon(camp);
    expect(d.size).toEqual({ w: 5, h: 3 });
    // 右右上上右右下：r1(0,2) → r8(4,1)，入口在 (0,2)
    expect(d.playerPos).toEqual({ x: 0, y: 2 });
    expect(countRooms(d)).toBe(8);
    expect(reachableCount(d)).toBe(8);
    const entrance = d.rooms[2][0]!;
    expect(entrance.type).toBe("entrance");
    expect(entrance.explored).toBe(true);
    // 纯线：每房度数 ≤ 2，恰有两个端点（入口与 Boss 房）
    const degrees = [0, 1, 2].flatMap((y) =>
      [0, 1, 2, 3, 4].map((x) => ({ x, y, deg: degreeOf(d, x, y) }))
    ).filter((p) => d.rooms[p.y][p.x]);
    expect(degrees.every((p) => p.deg <= 2)).toBe(true);
    expect(degrees.filter((p) => p.deg === 1)).toHaveLength(2);
    // 深度 0..7（纯线 BFS 距离）
    const depths = [0, 1, 2].flatMap((y) => [0, 1, 2, 3, 4].map((x) => d.rooms[y][x]?.depth ?? -1));
    expect(Math.max(...depths)).toBe(7);
    // Boss 房在 (4,1)
    const boss = d.rooms[1][4]!;
    expect(boss.type).toBe("boss");
    expect(boss.enemyIds).toEqual(["goblin_king"]);
  });

  it("静态房间内容来自 rooms 定义：敌人/物品/roomKey 逐房正确", () => {
    const d = generateDungeon(camp);
    const at = (x: number, y: number) => d.rooms[y][x]!;
    expect(at(0, 2).roomKey).toBe("r1");
    expect(at(0, 2).itemIds).toEqual(["bag_spirit"]);
    expect(at(1, 2).roomKey).toBe("r2");
    expect(at(1, 2).enemyIds).toEqual(["goblin_camp_watch"]);
    expect(at(2, 2).itemIds).toEqual(["health_potion", "mana_potion"]);
    expect(at(2, 0).roomKey).toBe("r5");
    expect(at(3, 0).roomKey).toBe("r6");
    expect(at(4, 0).roomKey).toBe("r7");
    expect(at(4, 1).roomKey).toBe("r8");
    expect(at(4, 1).itemIds).toEqual(["iron_sword", "health_potion"]);
    // 墙格为 null
    expect(d.rooms[0][0]).toBeNull();
    expect(d.rooms[1][0]).toBeNull();
    expect(d.rooms[1][3]).toBeNull();
    expect(d.rooms[2][3]).toBeNull();
  });
});

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
    expect(n).toBeGreaterThanOrEqual(forest.roomCount! - 3);
    expect(n).toBeLessThanOrEqual(forest.roomCount! + 10);
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
          const pool = forest.enemyPool!.find((e) => e.enemyId === id)!;
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

describe("generateDungeon（多种子不变量，防回归）", () => {
  it("50 个随机种子全部满足生成不变量", () => {
    for (let seed = 0; seed < 50; seed++) {
      const label = `seed ${seed}`;
      const d = generateDungeon(forest, seeded(seed));
      const { count, branched, maxDepth, boss } = metrics(d);

      // 房数在目标附近（软约束）
      expect(count, `${label} 房数`).toBeGreaterThanOrEqual(forest.roomCount! - 3);
      expect(count, `${label} 房数`).toBeLessThanOrEqual(forest.roomCount! + 10);
      // 稀疏：存在墙格
      expect(d.rooms.flat().some((r) => r === null), `${label} 稀疏`).toBe(true);
      // 全连通
      expect(reachableCount(d), `${label} 全连通`).toBe(count);
      // 存储深度与 BFS 重算一致（敌人分布依赖 depth）
      const bfs = bfsDepths(d);
      for (let y = 0; y < d.size.h; y++) {
        for (let x = 0; x < d.size.w; x++) {
          if (!d.rooms[y][x]) continue;
          expect(d.rooms[y][x]!.depth, `${label} 深度(${x},${y})`).toBe(bfs[y][x]);
        }
      }
      // Boss：唯一、最深、非入口、携带 Boss 敌人
      expect(boss, `${label} Boss 存在`).not.toBeNull();
      const bossRoom = d.rooms[boss!.y][boss!.x]!;
      expect(boss, `${label} Boss 非入口`).not.toEqual({
        x: d.playerPos.x,
        y: d.playerPos.y,
      });
      expect(bossRoom.depth, `${label} Boss 最深`).toBe(maxDepth);
      expect(maxDepth, `${label} 深度`).toBeGreaterThan(0);
      expect(bossRoom.enemyIds, `${label} Boss 敌人`).toContain(forest.bossId);
      // 必经房间（割点）与多分支
      expect(articulationPoints(d).length, `${label} 必经房间`).toBeGreaterThanOrEqual(1);
      expect(branched, `${label} 多分支`).toBeGreaterThanOrEqual(1);
      // 敌人深度全部落在池区间内
      for (let y = 0; y < d.size.h; y++) {
        for (let x = 0; x < d.size.w; x++) {
          const r = d.rooms[y][x];
          if (!r || r.type !== "normal") continue;
          const norm = Math.floor((r.depth * 10) / maxDepth);
          for (const id of r.enemyIds) {
            const pool = forest.enemyPool!.find((e) => e.enemyId === id)!;
            expect(norm, `${label} 敌人 ${id} @${norm}`).toBeGreaterThanOrEqual(pool.minDepth);
            expect(norm, `${label} 敌人 ${id} @${norm}`).toBeLessThanOrEqual(pool.maxDepth);
          }
        }
      }
    }
  });
});
