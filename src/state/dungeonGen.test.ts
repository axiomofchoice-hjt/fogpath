import { describe, expect, it } from "vitest";
import { dungeons } from "../data/config";
import { generateDungeon } from "./dungeonGen";

/** 固定随机序列便于断言 */
function seeded(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

const forest = dungeons.forest;

describe("generateDungeon", () => {
  it("尺寸与入口正确，初始全迷雾", () => {
    const d = generateDungeon(forest, seeded([0.5]));
    expect(d.size).toEqual({ w: 6, h: 6 });
    expect(d.playerPos).toEqual({ x: 0, y: 0 });
    expect(d.rooms[0][0].type).toBe("entrance");
    expect(d.rooms[0][0].explored).toBe(true); // 入口格直接可见
    d.rooms.forEach((row, y) =>
      row.forEach((r, x) => {
        if (x === 0 && y === 0) return;
        expect(r.explored).toBe(false);
      })
    );
  });

  it("Boss 房唯一且位于最深处", () => {
    const d = generateDungeon(forest, seeded([0.5, 0.5, 0.5]));
    const bossRooms = d.rooms.flat().filter((r) => r.type === "boss");
    expect(bossRooms).toHaveLength(1);
    // 最深处 = 曼哈顿距离最大（6×6 → 10）
    let bossDepth = 0;
    d.rooms.forEach((row, y) =>
      row.forEach((r, x) => {
        if (r.type === "boss") bossDepth = x + y;
      })
    );
    expect(bossDepth).toBe(10);
    expect(d.rooms.flat().filter((r) => r.type === "boss")[0].enemyIds).toContain("goblin_king");
  });

  it("普通房敌人都在深度区间内（goblin_brute 只出现在深层）", () => {
    const d = generateDungeon(forest, seeded([0.9]));
    d.rooms.forEach((row, y) =>
      row.forEach((r, x) => {
        if (r.type !== "normal") return;
        const depth = x + y;
        for (const id of r.enemyIds) {
          const pool = forest.enemyPool.find((e) => e.enemyId === id)!;
          expect(depth, `${id} @ depth ${depth}`).toBeGreaterThanOrEqual(pool.minDepth);
          expect(depth, `${id} @ depth ${depth}`).toBeLessThanOrEqual(pool.maxDepth);
        }
      })
    );
  });

  it("物品全部来自物品池", () => {
    const d = generateDungeon(forest, seeded([0.5]));
    for (const room of d.rooms.flat()) {
      for (const id of room.itemIds) {
        expect(forest.itemPool).toContain(id);
      }
    }
  });

  it("入口格无敌人物品", () => {
    const d = generateDungeon(forest, seeded([0.5]));
    expect(d.rooms[0][0].enemyIds).toEqual([]);
  });
});
