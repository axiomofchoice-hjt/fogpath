import { describe, expect, it, vi } from "vitest";
import type { DungeonRoom, GameState } from "../types";
import { gameReducer, initialGameState, initialPlayer, rollLoot } from "./gameReducer";
import { loot } from "../data/config";

describe("rollLoot（掉落结算）", () => {
  it("rng=0：所有条目掉落 + 最低金币", () => {
    const drop = rollLoot(["goblin", "goblin_king"], () => 0);
    expect(drop.items.length).toBeGreaterThan(0);
    // goblin 5-15 + king 100-300 → 最低 105
    expect(drop.gold).toBe(105);
  });

  it("rng=0.99：无掉落 + 最高金币", () => {
    const drop = rollLoot(["goblin"], () => 0.99);
    expect(drop.items).toEqual([]);
    expect(drop.gold).toBe(15);
  });

  it("未知敌人不产生掉落", () => {
    expect(rollLoot(["ghost"], () => 0)).toEqual({ items: [], gold: 0 });
  });
});

function startAtEntrance(): GameState {
  return {
    ...initialGameState(),
    screen: "game",
    player: { ...initialPlayer(), currentRoomId: "forest_entrance" },
  };
}

function entered(): GameState {
  return gameReducer(startAtEntrance(), { type: "ENTER_DUNGEON", dungeonId: "forest" });
}

const NEIGHBORS = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;

/** 找入口/当前位置的任意一个存在邻格 */
function firstNeighbor(s: GameState): { x: number; y: number } | null {
  const d = s.dungeon!;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = d.playerPos.x + dx;
    const ny = d.playerPos.y + dy;
    if (nx >= 0 && ny >= 0 && nx < d.size.w && ny < d.size.h && d.rooms[ny][nx]) {
      return { x: nx, y: ny };
    }
  }
  return null;
}

/** 找未探索且有敌人的邻格 */
function firstEnemyNeighbor(s: GameState): { x: number; y: number } | null {
  const d = s.dungeon!;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = d.playerPos.x + dx;
    const ny = d.playerPos.y + dy;
    const r = nx >= 0 && ny >= 0 && nx < d.size.w && ny < d.size.h ? d.rooms[ny][nx] : null;
    if (r && !r.explored && r.enemyIds.length > 0) return { x: nx, y: ny };
  }
  return null;
}

/** 手工构造 3×3 地牢：入口 (0,0)、墙 (0,1)、其余普通房，玩家在 (0,0) */
function miniDungeon(): GameState {
  const base = startAtEntrance();
  const room = (type: DungeonRoom["type"]): DungeonRoom => ({
    type,
    explored: false,
    depth: 0,
    enemyIds: [],
    itemIds: [],
  });
  const rooms: (DungeonRoom | null)[][] = [
    [room("entrance"), room("normal"), room("normal")],
    [null, room("normal"), room("normal")],
    [room("normal"), room("normal"), room("normal")],
  ];
  return {
    ...base,
    dungeon: { dungeonId: "forest", size: { w: 3, h: 3 }, rooms, playerPos: { x: 0, y: 0 } },
  };
}

describe("地牢：进入", () => {
  it("ENTER_DUNGEON 在入口房间生成稀疏大图", () => {
    const s = entered();
    expect(s.dungeon).not.toBeNull();
    expect(s.dungeon!.dungeonId).toBe("forest");
    expect(s.dungeon!.size).toEqual({ w: 15, h: 15 });
    expect(s.dungeon!.playerPos).toEqual({ x: 7, y: 7 });
    expect(s.dungeon!.rooms[7][7]!.type).toBe("entrance");
    // 稀疏：网格中存在墙（null）
    expect(s.dungeon!.rooms.flat().some((r) => r === null)).toBe(true);
  });

  it("ENTER_DUNGEON 非入口房间/战斗中/已有地牢被拒", () => {
    const square = { ...initialGameState(), screen: "game" as const };
    expect(gameReducer(square, { type: "ENTER_DUNGEON", dungeonId: "forest" })).toBe(square);
    const s = entered();
    expect(gameReducer(s, { type: "ENTER_DUNGEON", dungeonId: "forest" })).toBe(s);
    const inBattle = gameReducer(s, {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(gameReducer(inBattle, { type: "ENTER_DUNGEON", dungeonId: "forest" })).toBe(inBattle);
  });
});

describe("地牢：移动与情报", () => {
  it("DUNGEON_MOVE：空房间直接移动并点亮，有敌人则待情报确认", () => {
    const s = entered();
    const nb = firstNeighbor(s)!;
    const targetRoom = s.dungeon!.rooms[nb.y][nb.x]!;
    const next = gameReducer(s, {
      type: "DUNGEON_MOVE",
      dx: nb.x - s.dungeon!.playerPos.x,
      dy: nb.y - s.dungeon!.playerPos.y,
    });
    if (targetRoom.explored || targetRoom.enemyIds.length === 0) {
      expect(next.dungeon!.playerPos).toEqual(nb);
      expect(next.dungeon!.rooms[nb.y][nb.x]!.explored).toBe(true);
    } else {
      expect(next).toBe(s); // 未探索有敌人：不移动，等 DUNGEON_ENTER_TILE
    }
  });

  it("DUNGEON_MOVE：边界外/墙被拒", () => {
    const s = miniDungeon();
    const d = s.dungeon!;
    expect(d.rooms[1][0]).toBeNull(); // (0,1) 是墙
    expect(gameReducer(s, { type: "DUNGEON_MOVE", dx: 0, dy: 1 })).toBe(s); // 撞墙
    expect(gameReducer(s, { type: "DUNGEON_MOVE", dx: -1, dy: 0 })).toBe(s); // 边界外
    // 从右边缘 (2,0) 向右：边界外被拒
    const atRight: GameState = { ...s, dungeon: { ...d, playerPos: { x: 2, y: 0 } } };
    expect(gameReducer(atRight, { type: "DUNGEON_MOVE", dx: 1, dy: 0 })).toBe(atRight);
  });

  it("DUNGEON_MOVE：真实生成地牢中向墙移动被拒", () => {
    const s = entered();
    const d = s.dungeon!;
    // 找一个邻接墙格（null）的房间与方向
    let from: { x: number; y: number } | null = null;
    let dir: { dx: number; dy: number } | null = null;
    for (let y = 0; y < d.size.h && !from; y++) {
      for (let x = 0; x < d.size.w && !from; x++) {
        if (!d.rooms[y][x]) continue;
        for (const [dx, dy] of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < d.size.w && ny < d.size.h && !d.rooms[ny][nx]) {
            from = { x, y };
            dir = { dx, dy };
            break;
          }
        }
      }
    }
    if (!from || !dir) return; // 稀疏地图必有墙邻，理论不可能走到这里
    const at: GameState = { ...s, dungeon: { ...d, playerPos: from } };
    expect(gameReducer(at, { type: "DUNGEON_MOVE", dx: dir.dx, dy: dir.dy })).toBe(at);
  });

  it("DUNGEON_ENTER_TILE：未探索有敌人 → 移动 + 开战", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) return; // 生成随机：入口邻格可能无敌人，跳过
    const next = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: target.x, y: target.y });
    expect(next.battle).not.toBeNull();
    expect(next.dungeon!.playerPos).toEqual(target);
    expect(next.dungeon!.rooms[target.y][target.x]!.explored).toBe(true);
    expect(next.battle!.enemies.map((e) => e.defId)).toEqual(
      s.dungeon!.rooms[target.y][target.x]!.enemyIds
    );
  });

  it("DUNGEON_ENTER_TILE：非相邻/墙/已探索/无敌人被拒", () => {
    const s = entered();
    expect(gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 3, y: 3 })).toBe(s);
    expect(gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 1, y: 1 })).toBe(s);
    const m = miniDungeon();
    expect(gameReducer(m, { type: "DUNGEON_ENTER_TILE", x: 0, y: 1 })).toBe(m); // 墙
  });

  it("地牢战斗中无法移动/拾取/撤离", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) return;
    const inBattle = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: target.x, y: target.y });
    expect(inBattle.battle).not.toBeNull();
    expect(gameReducer(inBattle, { type: "DUNGEON_MOVE", dx: 1, dy: 0 })).toBe(inBattle);
    expect(gameReducer(inBattle, { type: "DUNGEON_RETREAT" })).toBe(inBattle);
    expect(gameReducer(inBattle, { type: "DUNGEON_PICKUP", itemId: "herb_bundle" })).toBe(inBattle);
  });
});

describe("地牢：战斗结算", () => {
  it("胜利：敌人清除、掉落入账、损耗保留", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) return;
    const inBattle = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: target.x, y: target.y });
    // 强制胜利：清空敌人 HP
    const won: GameState = {
      ...inBattle,
      battle: {
        ...inBattle.battle!,
        result: "victory",
        playerStats: { ...inBattle.battle!.playerStats, hp: 77 },
      },
    };
    vi.spyOn(Math, "random").mockReturnValue(0);
    const exited = gameReducer(won, { type: "EXIT_BATTLE" });
    vi.restoreAllMocks();
    expect(exited.battle).toBeNull();
    expect(exited.dungeon).not.toBeNull();
    const room = exited.dungeon!.rooms[target.y][target.x]!;
    expect(room.enemyIds).toEqual([]);
    // 全掉 + 最大金币（rng=0 → 全部掉落，金币 min）
    const beforeGold = initialPlayer().inventory.find((e) => e.itemId === "gold")!.quantity;
    const afterGold = exited.player.inventory.find((e) => e.itemId === "gold")!.quantity;
    expect(afterGold).toBeGreaterThanOrEqual(beforeGold);
    expect(exited.player.hp).toBe(77); // 损耗保留
  });

  it("胜利：掉落金币按表入账（rng=0 → 各表最低金币）", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) return;
    const inBattle = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: target.x, y: target.y });
    const won: GameState = {
      ...inBattle,
      battle: {
        ...inBattle.battle!,
        result: "victory",
        playerStats: { ...inBattle.battle!.playerStats, hp: 100 },
      },
    };
    const enemyIds = s.dungeon!.rooms[target.y][target.x]!.enemyIds;
    const beforeGold = inBattle.player.inventory.find((e) => e.itemId === "gold")!.quantity;
    vi.spyOn(Math, "random").mockReturnValue(0);
    const exited = gameReducer(won, { type: "EXIT_BATTLE" });
    vi.restoreAllMocks();
    const expected = enemyIds.reduce((sum, id) => sum + loot[id].gold[0], 0);
    const afterGold = exited.player.inventory.find((e) => e.itemId === "gold")!.quantity;
    expect(expected).toBeGreaterThan(0);
    expect(afterGold).toBe(beforeGold + expected);
  });

  it("地牢存在时开测试战斗：败北按测试通道结算，不触发地牢惩罚", () => {
    const s = entered();
    const back = gameReducer(s, { type: "BACK_TO_START" });
    expect(back.screen).toBe("start");
    expect(back.dungeon).not.toBeNull();
    const inTest = gameReducer(back, {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(inTest.battle?.scenarioId).toBe("test_atk_vs_atk");
    const defeated: GameState = {
      ...inTest,
      battle: { ...inTest.battle!, result: "defeat" },
    };
    const exited = gameReducer(defeated, { type: "EXIT_BATTLE" });
    expect(exited.dungeon).not.toBeNull(); // 地牢不废弃
    expect(exited.player.equipment[0]).toBe("rusty_sword"); // 装备不丢
    expect(exited.player.hp).toBe(exited.player.maxHp);
  });

  it("败北：装备全丢、背包保留、地牢废弃回村回满", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) return;
    const inBattle = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: target.x, y: target.y });
    const lost: GameState = {
      ...inBattle,
      battle: {
        ...inBattle.battle!,
        result: "defeat",
        playerStats: { ...inBattle.battle!.playerStats, hp: 0 },
      },
    };
    const exited = gameReducer(lost, { type: "EXIT_BATTLE" });
    expect(exited.battle).toBeNull();
    expect(exited.dungeon).toBeNull();
    expect(exited.player.equipment).toEqual([null, null, null, null, null, null]);
    expect(exited.player.hp).toBe(exited.player.maxHp);
    expect(exited.player.inventory.some((e) => e.itemId === "gold")).toBe(true);
  });

  it("撤离：地牢废弃、回入口、回满", () => {
    const s = entered();
    const inDungeon: GameState = {
      ...s,
      player: { ...s.player, hp: 30, mp: 20 },
    };
    const retreated = gameReducer(inDungeon, { type: "DUNGEON_RETREAT" });
    expect(retreated.dungeon).toBeNull();
    expect(retreated.player.currentRoomId).toBe("forest_entrance");
    expect(retreated.player.hp).toBe(retreated.player.maxHp);
    expect(retreated.player.mp).toBe(retreated.player.maxMp);
  });
});

describe("地牢：拾取", () => {
  it("DUNGEON_PICKUP：当前格物品入背包并移除", () => {
    const s = entered();
    const d = s.dungeon!;
    // 入口无物品，直接构造
    const withItem: GameState = {
      ...s,
      dungeon: {
        ...d,
        rooms: d.rooms.map((row, y) =>
          row.map((r, x) => (x === 7 && y === 7 ? { ...r!, itemIds: ["herb_bundle"] } : r))
        ),
      },
    };
    const picked = gameReducer(withItem, { type: "DUNGEON_PICKUP", itemId: "herb_bundle" });
    expect(picked.dungeon!.rooms[7][7]!.itemIds).toEqual([]);
    expect(picked.player.inventory).toContainEqual({ itemId: "herb_bundle", quantity: 1 });
    // 不在当前格的物品不可拾取
    expect(gameReducer(withItem, { type: "DUNGEON_PICKUP", itemId: "mana_potion" })).toBe(withItem);
  });
});
