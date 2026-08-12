import { describe, expect, it } from "vitest";
import type { DungeonRoom, GameState } from "../types";
import { gameReducer } from "./gameReducer";
import { initialGameState, initialPlayer } from "./init";
import { rollLoot } from "./helpers";
import { mulberry32 } from "./rng";

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
    player: { ...initialPlayer(), currentRoomId: "goblin_camp_entrance" },
  };
}

function entered(): GameState {
  return gameReducer(startAtEntrance(), {
    type: "ENTER_DUNGEON",
    dungeonId: "goblin_camp",
    seed: 1,
  });
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
  it("ENTER_DUNGEON 在入口房间进入哥布林营地（静态布局）", () => {
    const s = entered();
    expect(s.dungeon).not.toBeNull();
    expect(s.dungeon!.dungeonId).toBe("goblin_camp");
    expect(s.dungeon!.size).toEqual({ w: 5, h: 3 });
    expect(s.dungeon!.playerPos).toEqual({ x: 0, y: 2 });
    expect(s.dungeon!.rooms[2][0]!.type).toBe("entrance");
    // 静态营地：8 房全连通、入口已探索、哨戒房有教学哥布林
    const rooms = s.dungeon!.rooms.flat().filter(Boolean);
    expect(rooms).toHaveLength(8);
    expect(s.dungeon!.rooms[2][0]!.explored).toBe(true);
    expect(s.dungeon!.rooms[2][1]!.enemyIds).toEqual(["goblin_camp_watch"]);
  });

  it("ENTER_DUNGEON 非入口房间/战斗中/已有地牢断言失败", () => {
    const square = { ...initialGameState(), screen: "game" as const };
    expect(() => gameReducer(square, { type: "ENTER_DUNGEON", dungeonId: "goblin_camp", seed: 1 })).toThrow(
      /ENTER_DUNGEON/
    );
    const s = entered();
    expect(() => gameReducer(s, { type: "ENTER_DUNGEON", dungeonId: "goblin_camp", seed: 1 })).toThrow(
      /ENTER_DUNGEON/
    );
    const inBattle = gameReducer(s, {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
      seed: 1,
    });
    expect(() => gameReducer(inBattle, { type: "ENTER_DUNGEON", dungeonId: "goblin_camp", seed: 1 })).toThrow(
      /ENTER_DUNGEON/
    );
  });
});

describe("地牢：移动与情报", () => {
  it("DUNGEON_MOVE：空房间直接移动并点亮，有敌人断言失败（待情报确认）", () => {
    const s = entered();
    const nb = firstNeighbor(s)!;
    const targetRoom = s.dungeon!.rooms[nb.y][nb.x]!;
    const delta = { dx: nb.x - s.dungeon!.playerPos.x, dy: nb.y - s.dungeon!.playerPos.y };
    if (targetRoom.explored || targetRoom.enemyIds.length === 0) {
      const next = gameReducer(s, { type: "DUNGEON_MOVE", ...delta });
      expect(next.dungeon!.playerPos).toEqual(nb);
      expect(next.dungeon!.rooms[nb.y][nb.x]!.explored).toBe(true);
    } else {
      expect(() => gameReducer(s, { type: "DUNGEON_MOVE", ...delta })).toThrow(/DUNGEON_MOVE/);
    }
  });

  it("DUNGEON_MOVE：边界外/墙断言失败", () => {
    const s = miniDungeon();
    const d = s.dungeon!;
    expect(d.rooms[1][0]).toBeNull(); // (0,1) 是墙
    expect(() => gameReducer(s, { type: "DUNGEON_MOVE", dx: 0, dy: 1 })).toThrow(/DUNGEON_MOVE/);
    expect(() => gameReducer(s, { type: "DUNGEON_MOVE", dx: -1, dy: 0 })).toThrow(/DUNGEON_MOVE/);
    // 从右边缘 (2,0) 向右：边界外断言失败
    const atRight: GameState = { ...s, dungeon: { ...d, playerPos: { x: 2, y: 0 } } };
    expect(() => gameReducer(atRight, { type: "DUNGEON_MOVE", dx: 1, dy: 0 })).toThrow(
      /DUNGEON_MOVE/
    );
  });

  it("DUNGEON_MOVE：真实生成地牢中向墙移动断言失败", () => {
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
    if (!from || !dir) {
      // 前置条件：静态营地为稀疏地图必有墙邻，理论不可达；失败即测试环境变化，不得静默跳过
      expect(from).not.toBeNull();
      expect(dir).not.toBeNull();
      return;
    }
    const at: GameState = { ...s, dungeon: { ...d, playerPos: from } };
    expect(() => gameReducer(at, { type: "DUNGEON_MOVE", dx: dir.dx, dy: dir.dy })).toThrow(
      /DUNGEON_MOVE/
    );
  });

  it("DUNGEON_ENTER_TILE：未探索有敌人 → 移动 + 开战", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) { expect(target, "静态营地入口必有未探索敌人邻格").not.toBeNull(); return; }
    const next = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: target.x, y: target.y, seed: 1 });
    expect(next.battle).not.toBeNull();
    expect(next.dungeon!.playerPos).toEqual(target);
    expect(next.dungeon!.rooms[target.y][target.x]!.explored).toBe(true);
    expect(next.battle!.enemies.map((e) => e.defId)).toEqual(
      s.dungeon!.rooms[target.y][target.x]!.enemyIds
    );
  });

  it("DUNGEON_ENTER_TILE：非相邻/墙断言失败", () => {
    const s = entered();
    expect(() => gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 3, y: 3, seed: 1 })).toThrow(
      /DUNGEON_ENTER_TILE/
    );
    expect(() => gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 1, y: 1, seed: 1 })).toThrow(
      /DUNGEON_ENTER_TILE/
    );
    const m = miniDungeon();
    expect(() => gameReducer(m, { type: "DUNGEON_ENTER_TILE", x: 0, y: 1, seed: 1 })).toThrow(
      /DUNGEON_ENTER_TILE/
    );
  });

  it("同一 seed 两次进入同一房间：敌人模式一致（reducer 确定性）", () => {
    const s = entered();
    const a = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 1, y: 2, seed: 42 });
    const b = gameReducer(s, { type: "DUNGEON_ENTER_TILE", x: 1, y: 2, seed: 42 });
    expect(a.battle).not.toBeNull();
    expect(a.battle!.enemies).toEqual(b.battle!.enemies);
  });

  it("地牢战斗中无法移动/拾取/撤离（断言失败）", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) { expect(target, "静态营地入口必有未探索敌人邻格").not.toBeNull(); return; }
    const inBattle = gameReducer(s, {
      type: "DUNGEON_ENTER_TILE",
      x: target.x,
      y: target.y,
      seed: 1,
    });
    expect(inBattle.battle).not.toBeNull();
    expect(() => gameReducer(inBattle, { type: "DUNGEON_MOVE", dx: 1, dy: 0 })).toThrow(
      /DUNGEON_MOVE/
    );
    expect(() => gameReducer(inBattle, { type: "DUNGEON_RETREAT" })).toThrow(/DUNGEON_RETREAT/);
    expect(() => gameReducer(inBattle, { type: "DUNGEON_PICKUP", itemId: "herb_bundle" })).toThrow(
      /DUNGEON_PICKUP/
    );
  });
});

describe("地牢：战斗结算", () => {
  it("胜利：敌人清除、掉落入账、损耗保留", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) { expect(target, "静态营地入口必有未探索敌人邻格").not.toBeNull(); return; }
    const inBattle = gameReducer(s, {
      type: "DUNGEON_ENTER_TILE",
      x: target.x,
      y: target.y,
      seed: 1,
    });
    // 强制胜利：清空敌人 HP
    const won: GameState = {
      ...inBattle,
      battle: {
        ...inBattle.battle!,
        result: "victory",
        playerStats: { ...inBattle.battle!.playerStats, hp: 77 },
      },
    };
    const seed = 42;
    const exited = gameReducer(won, { type: "EXIT_BATTLE", seed });
    expect(exited.battle).toBeNull();
    expect(exited.dungeon).not.toBeNull();
    const room = exited.dungeon!.rooms[target.y][target.x]!;
    expect(room.enemyIds).toEqual([]);
    // 掉落入账：金币增量 = 掉落结算（同 seed）+ 金币条目；其余物品逐个入包
    const enemyIds = s.dungeon!.rooms[target.y][target.x]!.enemyIds;
    const drop = rollLoot(enemyIds, mulberry32(seed));
    const beforeGold = initialPlayer().inventory.find((e) => e.itemId === "gold")!.quantity;
    const afterGold = exited.player.inventory.find((e) => e.itemId === "gold")!.quantity;
    const goldDelta = drop.gold + drop.items.filter((id) => id === "gold").length;
    expect(afterGold).toBe(beforeGold + goldDelta);
    for (const id of drop.items) {
      if (id !== "gold") {
        expect(exited.player.inventory).toContainEqual({ itemId: id, quantity: 1 });
      }
    }
    expect(exited.player.hp).toBe(77); // HP 损耗保留
    expect(exited.player.mp).toBe(exited.player.maxMp); // 非战斗状态 MP 自动回满
  });

  it("胜利：同一 seed 两次结算掉落入账一致（reducer 确定性）", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) { expect(target, "静态营地入口必有未探索敌人邻格").not.toBeNull(); return; }
    const inBattle = gameReducer(s, {
      type: "DUNGEON_ENTER_TILE",
      x: target.x,
      y: target.y,
      seed: 1,
    });
    const won: GameState = {
      ...inBattle,
      battle: {
        ...inBattle.battle!,
        result: "victory",
        playerStats: { ...inBattle.battle!.playerStats, hp: 100 },
      },
    };
    const a = gameReducer(won, { type: "EXIT_BATTLE", seed: 7 });
    const b = gameReducer(won, { type: "EXIT_BATTLE", seed: 7 });
    expect(a.player.inventory).toEqual(b.player.inventory);
  });

  it("地牢存在时开测试战斗：败北按测试通道结算，不触发地牢惩罚", () => {
    const s = entered();
    const back = gameReducer(s, { type: "BACK_TO_START" });
    expect(back.screen).toBe("start");
    expect(back.dungeon).not.toBeNull();
    const inTest = gameReducer(back, {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
      seed: 1,
    });
    expect(inTest.battle?.scenarioId).toBe("test_atk_vs_atk");
    const defeated: GameState = {
      ...inTest,
      battle: { ...inTest.battle!, result: "defeat" },
    };
    const exited = gameReducer(defeated, { type: "EXIT_BATTLE", seed: 1 });
    expect(exited.dungeon).not.toBeNull(); // 地牢不废弃
    expect(exited.player.equipment[0]).toBe("rusty_sword"); // 装备不丢
    expect(exited.player.hp).toBe(exited.player.maxHp);
  });

  it("败北：装备全丢、背包保留、地牢废弃回村回满", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s);
    if (!target) { expect(target, "静态营地入口必有未探索敌人邻格").not.toBeNull(); return; }
    const inBattle = gameReducer(s, {
      type: "DUNGEON_ENTER_TILE",
      x: target.x,
      y: target.y,
      seed: 1,
    });
    const lost: GameState = {
      ...inBattle,
      battle: {
        ...inBattle.battle!,
        result: "defeat",
        playerStats: { ...inBattle.battle!.playerStats, hp: 0 },
      },
    };
    const exited = gameReducer(lost, { type: "EXIT_BATTLE", seed: 1 });
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
    expect(retreated.player.currentRoomId).toBe("goblin_camp_entrance");
    expect(retreated.player.hp).toBe(retreated.player.maxHp);
    expect(retreated.player.mp).toBe(retreated.player.maxMp);
  });
});

describe("地牢：拾取", () => {
  it("DUNGEON_PICKUP：当前格物品入背包并移除", () => {
    const s = entered();
    const d = s.dungeon!;
    // 入口在 (0,2)：覆盖其物品为 herb_bundle
    const withItem: GameState = {
      ...s,
      dungeon: {
        ...d,
        rooms: d.rooms.map((row, y) =>
          row.map((r, x) => (x === 0 && y === 2 ? { ...r!, itemIds: ["herb_bundle"] } : r))
        ),
      },
    };
    const picked = gameReducer(withItem, { type: "DUNGEON_PICKUP", itemId: "herb_bundle" });
    expect(picked.dungeon!.rooms[2][0]!.itemIds).toEqual([]);
    expect(picked.player.inventory).toContainEqual({ itemId: "herb_bundle", quantity: 1 });
    // 不在当前格的物品断言失败
    expect(() => gameReducer(withItem, { type: "DUNGEON_PICKUP", itemId: "mana_potion" })).toThrow(
      /DUNGEON_PICKUP/
    );
  });

  it("进入营地：入口背包精灵自动入背包并置 hasPet（无需点击）", () => {
    const s = entered();
    expect(s.player.inventory).toContainEqual({ itemId: "bag_spirit", quantity: 1 });
    expect(s.player.hasPet).toBe(true);
    // 入口地面不再显示物品
    expect(s.dungeon!.rooms[2][0]!.itemIds).toEqual([]);
  });

  it("撤离回村：背包精灵消失（背包移除 + hasPet 复位）", () => {
    const s = entered();
    const retreated = gameReducer(s, { type: "DUNGEON_RETREAT" });
    expect(retreated.player.hasPet).toBe(false);
    expect(retreated.player.inventory.some((e) => e.itemId === "bag_spirit")).toBe(false);
  });

  it("死亡回村：背包精灵消失（背包移除 + hasPet 复位）", () => {
    const s = entered();
    const target = firstEnemyNeighbor(s)!;
    const inBattle = gameReducer(s, {
      type: "DUNGEON_ENTER_TILE",
      x: target.x,
      y: target.y,
      seed: 1,
    });
    const lost: GameState = {
      ...inBattle,
      battle: {
        ...inBattle.battle!,
        result: "defeat",
        playerStats: { ...inBattle.battle!.playerStats, hp: 0 },
      },
    };
    const exited = gameReducer(lost, { type: "EXIT_BATTLE", seed: 1 });
    expect(exited.dungeon).toBeNull();
    expect(exited.player.hasPet).toBe(false);
    expect(exited.player.inventory.some((e) => e.itemId === "bag_spirit")).toBe(false);
  });
});
