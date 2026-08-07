import type { DungeonDef, DungeonRoom, DungeonState } from "../types";

/** 随机源（可注入便于测试） */
export type Rng = () => number;

function pickWeighted<T>(pool: T[], weight: (t: T) => number, rng: Rng): T {
  const total = pool.reduce((sum, t) => sum + weight(t), 0);
  let roll = rng() * total;
  for (const t of pool) {
    roll -= weight(t);
    if (roll < 0) return t;
  }
  return pool[pool.length - 1];
}

function pickOne<T>(list: T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)];
}

/**
 * 地牢生成（GDD 3.3 简化版）：
 * - N×M 方格，全部房间相邻即可通行（全连通，天然多分支）
 * - 入口 (0,0)，Boss 房位于离入口最远的格（曼哈顿最远，随机取一）
 * - 普通房按深度分布敌人（敌人池按深度区间加权随机）与物品；Boss 房放宝箱物品
 */
export function generateDungeon(def: DungeonDef, rng: Rng = Math.random): DungeonState {
  const { w, h } = def.size;
  const rooms: DungeonRoom[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({
      type: "normal" as const,
      explored: false,
      enemyIds: [],
      itemIds: [],
    }))
  );
  rooms[0][0].type = "entrance";
  rooms[0][0].explored = true; // 入口格已探索（当前房间不再显示迷雾）

  // 深度 = 曼哈顿距离（全连通网格的最短路径）
  const depthOf = (x: number, y: number) => x + y;

  // Boss 房：最深处随机取一
  let maxDepth = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      maxDepth = Math.max(maxDepth, depthOf(x, y));
    }
  }
  const deepest: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (depthOf(x, y) === maxDepth) deepest.push({ x, y });
    }
  }
  const bossPos = pickOne(deepest, rng);
  rooms[bossPos.y][bossPos.x].type = "boss";
  rooms[bossPos.y][bossPos.x].enemyIds = [def.bossId];

  // 普通房：敌人 + 物品
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const room = rooms[y][x];
      if (room.type !== "normal") continue;
      const depth = depthOf(x, y);
      // 敌人概率随深度递增（入口邻格教学，浅层稀疏）
      const enemyChance =
        depth === 0 ? 0.15 : depth === 1 ? 0.4 : depth === 2 ? 0.55 : 0.7;
      if (rng() < enemyChance) {
        const candidates = def.enemyPool.filter(
          (e) => depth >= e.minDepth && depth <= e.maxDepth
        );
        const picked =
          candidates.length > 0
            ? pickWeighted(candidates, (e) => e.weight, rng)
            : undefined;
        if (picked) {
          room.enemyIds.push(picked.enemyId);
          // 深层有概率双怪
          if (depth >= 2 && rng() < 0.15) {
            const second = pickWeighted(candidates, (e) => e.weight, rng);
            if (second) room.enemyIds.push(second.enemyId);
          }
        }
      }
      if (rng() < 0.3 && def.itemPool.length > 0) {
        room.itemIds.push(pickOne(def.itemPool, rng));
      }
    }
  }

  // Boss 房宝箱：固定 2 件物品池物品
  for (let i = 0; i < 2 && def.itemPool.length > 0; i++) {
    rooms[bossPos.y][bossPos.x].itemIds.push(pickOne(def.itemPool, rng));
  }

  return {
    dungeonId: def.id,
    size: { w, h },
    rooms,
    playerPos: { x: 0, y: 0 },
  };
}
