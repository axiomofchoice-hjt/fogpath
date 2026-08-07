import { describe, expect, it, vi } from "vitest";
import type { GameState } from "../types";
import { gameReducer, initialGameState, initialPlayer, rollLoot } from "./gameReducer";

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

describe("地牢：进入", () => {
  it("ENTER_DUNGEON 在入口房间生成地牢", () => {
    const s = entered();
    expect(s.dungeon).not.toBeNull();
    expect(s.dungeon!.dungeonId).toBe("forest");
    expect(s.dungeon!.size).toEqual({ w: 6, h: 6 });
    expect(s.dungeon!.playerPos).toEqual({ x: 0, y: 0 });
    expect(s.dungeon!.rooms[0][0].type).toBe("entrance");
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
    const targetRoom = s.dungeon!.rooms[0][1];
    const next = gameReducer(s, { type: "DUNGEON_MOVE", dx: 1, dy: 0 });
    if (targetRoom.explored || targetRoom.enemyIds.length === 0) {
      expect(next.dungeon!.playerPos).toEqual({ x: 1, y: 0 });
      expect(next.dungeon!.rooms[0][1].explored).toBe(true);
    } else {
      expect(next).toBe(s); // 未探索有敌人：不移动，等 DUNGEON_ENTER_TILE
    }
  });

  it("DUNGEON_MOVE：边界外被拒", () => {
    const s = entered();
    expect(gameReducer(s, { type: "DUNGEON_MOVE", dx: -1, dy: 0 })).toBe(s);
    expect(gameReducer(s, { type: "DUNGEON_MOVE", dx: 0, dy: -1 })).toBe(s);
  });

  it("DUNGEON_ENTER_TILE：未探索有敌人 → 移动 + 开战", () => {
    const s = entered();
    // 找一个未探索且有敌人的邻格
    const d = s.dungeon!;
    let target: { x: number; y: number } | null = null;
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const room = d.rooms[dy][dx];
      if (!room.explored && room.enemyIds.length > 0) target = { x: dx, y: dy };
    }
    if (!target) return; // 生成随机：邻格可能无敌人，跳过
    const next = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: target.x, y: target.y });
    expect(next.battle).not.toBeNull();
    expect(next.dungeon!.playerPos).toEqual(target);
    expect(next.dungeon!.rooms[target.y][target.x].explored).toBe(true);
    expect(next.battle!.enemies.map((e) => e.defId)).toEqual(
      d.rooms[target.y][target.x].enemyIds
    );
  });

  it("DUNGEON_ENTER_TILE：非相邻/已探索/无敌人被拒", () => {
    const s = entered();
    expect(gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 3, y: 3 })).toBe(s);
    expect(gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 1, y: 1 })).toBe(s);
  });

  it("地牢战斗中无法移动/拾取/撤离", () => {
    const s = entered();
    const d = s.dungeon!;
    let target: { x: number; y: number } | null = null;
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      if (!d.rooms[dy][dx].explored && d.rooms[dy][dx].enemyIds.length > 0) target = { x: dx, y: dy };
    }
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
    const d = s.dungeon!;
    let target: { x: number; y: number } | null = null;
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      if (!d.rooms[dy][dx].explored && d.rooms[dy][dx].enemyIds.length > 0) target = { x: dx, y: dy };
    }
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
    const room = exited.dungeon!.rooms[target.y][target.x];
    expect(room.enemyIds).toEqual([]);
    // 全掉 + 最大金币（rng=0 → 全部掉落，金币 min）
    const beforeGold = initialPlayer().inventory.find((e) => e.itemId === "gold")!.quantity;
    const afterGold = exited.player.inventory.find((e) => e.itemId === "gold")!.quantity;
    expect(afterGold).toBeGreaterThanOrEqual(beforeGold);
    expect(exited.player.hp).toBe(77); // 损耗保留
  });

  it("败北：装备全丢、背包保留、地牢废弃回村回满", () => {
    const s = entered();
    const d = s.dungeon!;
    let target: { x: number; y: number } | null = null;
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      if (!d.rooms[dy][dx].explored && d.rooms[dy][dx].enemyIds.length > 0) target = { x: dx, y: dy };
    }
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
    // 找一个有物品的已探索格（入口格）——入口无物品，直接构造
    const withItem: GameState = {
      ...s,
      dungeon: {
        ...d,
        rooms: d.rooms.map((row, y) =>
          row.map((r, x) => (x === 0 && y === 0 ? { ...r, itemIds: ["herb_bundle"] } : r))
        ),
      },
    };
    const picked = gameReducer(withItem, { type: "DUNGEON_PICKUP", itemId: "herb_bundle" });
    expect(picked.dungeon!.rooms[0][0].itemIds).toEqual([]);
    expect(picked.player.inventory).toContainEqual({ itemId: "herb_bundle", quantity: 1 });
    // 不在当前格的物品不可拾取
    expect(gameReducer(withItem, { type: "DUNGEON_PICKUP", itemId: "mana_potion" })).toBe(withItem);
  });
});
