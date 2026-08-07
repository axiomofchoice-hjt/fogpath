import { describe, expect, it } from "vitest";
import type { GameState } from "../types";
import { gameReducer, goldAmount, initialGameState, initialPlayer } from "./gameReducer";

describe("初始状态", () => {
  it("初始玩家：100/100，生锈剑+盾，背包 2 药水 1 木杖", () => {
    const s = initialGameState();
    expect(s.screen).toBe("start");
    expect(s.battle).toBeNull();
    expect(s.player).toMatchObject({ hp: 100, maxHp: 100, mp: 100, maxMp: 100 });
    expect(s.player.equipment).toHaveLength(6);
    expect(s.player.equipment[0]).toBe("rusty_sword");
    expect(s.player.equipment[1]).toBe("rusty_shield");
    expect(s.player.inventory).toEqual([
      { itemId: "gold", quantity: 20 },
      { itemId: "health_potion", quantity: 2 },
      { itemId: "apprentice_staff", quantity: 1 },
    ]);
    expect(s.player.currentRoomId).toBe("village_square");
  });
});

describe("屏幕切换与重置", () => {
  it("START_GAME 进入游戏；重复调用不变", () => {
    const s = gameReducer(initialGameState(), { type: "START_GAME" });
    expect(s.screen).toBe("game");
    expect(gameReducer(s, { type: "START_GAME" })).toBe(s);
  });

  it("BACK_TO_START 保留玩家状态", () => {
    const started = gameReducer(initialGameState(), { type: "START_GAME" });
    const damaged = { ...started, player: { ...started.player, hp: 60, mp: 40 } };
    const back = gameReducer(damaged, { type: "BACK_TO_START" });
    expect(back.screen).toBe("start");
    expect(back.player.hp).toBe(60);
    expect(back.player.mp).toBe(40);
  });

  it("BACK_TO_START 战斗中被拒", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(gameReducer(s, { type: "BACK_TO_START" })).toBe(s);
  });

  it("RESET_GAME 清空进度", () => {
    const damaged = {
      ...initialGameState(),
      player: { ...initialPlayer(), hp: 30 },
      screen: "game" as const,
    };
    const reset = gameReducer(damaged, { type: "RESET_GAME" });
    expect(reset).toEqual(initialGameState());
  });

  it("RESET_GAME 战斗中被拒", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(gameReducer(s, { type: "RESET_GAME" })).toBe(s);
  });
});

describe("测试战斗流程", () => {
  it("START_TEST_BATTLE 初始化战斗", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(s.battle).not.toBeNull();
    expect(s.battle?.scenarioId).toBe("test_atk_vs_atk");
    expect(s.battle?.enemies).toHaveLength(1);
    expect(s.battle?.result).toBe("ongoing");
  });

  it("未知场景与战斗中的重复开启被拒", () => {
    expect(
      gameReducer(initialGameState(), { type: "START_TEST_BATTLE", scenarioId: "nope" })
    ).toEqual(initialGameState());
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(
      gameReducer(s, { type: "START_TEST_BATTLE", scenarioId: "test_atk_vs_atk" })
    ).toBe(s);
  });

  it("无战斗时 BATTLE_ACT / EXIT_BATTLE 被拒", () => {
    const init = initialGameState();
    expect(gameReducer(init, { type: "BATTLE_ACT", action: { kind: "rest" } })).toBe(init);
    expect(gameReducer(init, { type: "EXIT_BATTLE" })).toBe(init);
  });

  it("EXIT_BATTLE 战斗未结束时被拒（防绕过）", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(s.battle?.result).toBe("ongoing");
    expect(gameReducer(s, { type: "EXIT_BATTLE" })).toBe(s);
  });

  it("EXIT_BATTLE 后 HP/MP 自动回满", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    const hurt: GameState = {
      ...s,
      battle: s.battle
        ? { ...s.battle, result: "victory", playerStats: { ...s.battle.playerStats, hp: 60, mp: 70 } }
        : null,
    };
    const exited = gameReducer(hurt, { type: "EXIT_BATTLE" });
    expect(exited.battle).toBeNull();
    expect(exited.player.hp).toBe(exited.player.maxHp);
    expect(exited.player.mp).toBe(exited.player.maxMp);
  });
});

describe("拾取与丢弃", () => {
  it("PICKUP_ITEM 加入背包并标记，重复拾取无效", () => {
    const s = gameReducer(initialGameState(), { type: "PICKUP_ITEM", itemId: "herb_bundle" });
    expect(s.player.inventory).toContainEqual({ itemId: "herb_bundle", quantity: 1 });
    expect(s.player.pickedItemIds).toContain("herb_bundle");
    expect(gameReducer(s, { type: "PICKUP_ITEM", itemId: "herb_bundle" })).toBe(s);
  });

  it("未知物品拾取无效；战斗中拾取被拒", () => {
    const init = initialGameState();
    expect(gameReducer(init, { type: "PICKUP_ITEM", itemId: "nope" })).toBe(init);
    const s = gameReducer(init, {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(gameReducer(s, { type: "PICKUP_ITEM", itemId: "herb_bundle" })).toBe(s);
  });

  it("DISCARD_ITEM 按数量扣除直至移除", () => {
    const s = gameReducer(initialGameState(), { type: "DISCARD_ITEM", itemId: "health_potion" });
    expect(s.player.inventory).toContainEqual({ itemId: "health_potion", quantity: 1 });
    const s2 = gameReducer(s, { type: "DISCARD_ITEM", itemId: "health_potion" });
    expect(s2.player.inventory.find((e) => e.itemId === "health_potion")).toBeUndefined();
    const s3 = gameReducer(s2, { type: "DISCARD_ITEM", itemId: "health_potion" });
    expect(s3.player.inventory).toEqual(s2.player.inventory);
  });

  it("货币（金币）不可丢弃", () => {
    const init = initialGameState();
    expect(gameReducer(init, { type: "DISCARD_ITEM", itemId: "gold" })).toBe(init);
  });

  it("战斗中丢弃被拒", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(gameReducer(s, { type: "DISCARD_ITEM", itemId: "health_potion" })).toBe(s);
  });
});

describe("装备与卸下", () => {
  it("EQUIP 从背包装入空槽并重算属性", () => {
    const s = gameReducer(initialGameState(), { type: "EQUIP", itemId: "apprentice_staff" });
    expect(s.player.equipment[2]).toBe("apprentice_staff");
    expect(s.player.inventory.find((e) => e.itemId === "apprentice_staff")).toBeUndefined();
  });

  it("已装备 / 非装备类型 / 未知物品不可装备", () => {
    const init = initialGameState();
    expect(gameReducer(init, { type: "EQUIP", itemId: "rusty_sword" })).toBe(init);
    expect(gameReducer(init, { type: "EQUIP", itemId: "health_potion" })).toBe(init);
    expect(gameReducer(init, { type: "EQUIP", itemId: "nope" })).toBe(init);
  });

  it("装备栏满时不可装备", () => {
    const fullEquipment = [
      "rusty_sword",
      "rusty_shield",
      "iron_sword",
      "leather_cap",
      "leather_gloves",
      "leather_boots",
    ];
    const state = {
      ...initialGameState(),
      player: {
        ...initialPlayer(),
        equipment: fullEquipment,
        inventory: [{ itemId: "lucky_ring", quantity: 1 }],
      },
    };
    const s = gameReducer(state, { type: "EQUIP", itemId: "lucky_ring" });
    expect(s).toBe(state);
  });

  it("战斗中装备被拒", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(gameReducer(s, { type: "EQUIP", itemId: "apprentice_staff" })).toBe(s);
  });

  it("UNEQUIP 放回背包；空槽无效", () => {
    const s = gameReducer(initialGameState(), { type: "UNEQUIP", slotIndex: 0 });
    expect(s.player.equipment[0]).toBeNull();
    expect(s.player.inventory).toContainEqual({ itemId: "rusty_sword", quantity: 1 });
    const init = initialGameState();
    expect(gameReducer(init, { type: "UNEQUIP", slotIndex: 2 })).toBe(init);
  });

  it("战斗中卸下被拒", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(gameReducer(s, { type: "UNEQUIP", slotIndex: 0 })).toBe(s);
  });
});

describe("消耗品与休息", () => {
  it("USE_ITEM 恢复 HP 并扣除数量", () => {
    const hurt = { ...initialGameState(), player: { ...initialPlayer(), hp: 50, mp: 30 } };
    const s = gameReducer(hurt, { type: "USE_ITEM", itemId: "health_potion" });
    expect(s.player.hp).toBe(80);
    expect(s.player.inventory).toContainEqual({ itemId: "health_potion", quantity: 1 });
  });

  it("回复不超过上限", () => {
    const s = gameReducer(initialGameState(), { type: "USE_ITEM", itemId: "health_potion" });
    expect(s.player.hp).toBe(100);
    expect(s.player.mp).toBe(100);
  });

  it("装备类型 / 未知物品不可使用", () => {
    const init = initialGameState();
    expect(gameReducer(init, { type: "USE_ITEM", itemId: "rusty_sword" })).toBe(init);
    expect(gameReducer(init, { type: "USE_ITEM", itemId: "nope" })).toBe(init);
  });

  it("战斗中使用药水：作用于战斗内属性并扣除背包数量", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    const hurt: GameState = {
      ...s,
      battle: s.battle
        ? { ...s.battle, playerStats: { ...s.battle.playerStats, hp: 40 } }
        : null,
    };
    const used = gameReducer(hurt, { type: "USE_ITEM", itemId: "health_potion" });
    expect(used.battle?.playerStats.hp).toBe(70); // 40+30，哥布林首回合蓄力不攻击
    expect(used.battle?.turn).toBe(1);
    expect(used.player.inventory).toContainEqual({ itemId: "health_potion", quantity: 1 });
  });

  it("战斗中药水不足时不可使用", () => {
    const s = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    const noPotion: GameState = {
      ...s,
      player: {
        ...s.player,
        inventory: s.player.inventory.filter((e) => e.itemId !== "health_potion"),
      },
    };
    expect(gameReducer(noPotion, { type: "USE_ITEM", itemId: "health_potion" })).toBe(noPotion);
  });
});

describe("村庄：房间切换", () => {
  const game = { ...initialGameState(), screen: "game" as const };

  it("MOVE_ROOM：沿出口移动", () => {
    const s = gameReducer(game, { type: "MOVE_ROOM", roomId: "village_shop" });
    expect(s.player.currentRoomId).toBe("village_shop");
    expect(goldAmount(s.player)).toBe(20);
  });

  it("MOVE_ROOM：非出口 / 未知房间被拒", () => {
    expect(gameReducer(game, { type: "MOVE_ROOM", roomId: "nope" })).toBe(game);
    // 商店的出口只有广场，从广场直接再进广场不是出口（广场出口不含自己）
    expect(gameReducer(game, { type: "MOVE_ROOM", roomId: "village_square" })).toBe(game);
  });

  it("MOVE_ROOM：战斗中不可移动", () => {
    const s = gameReducer(game, {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
    });
    expect(s.battle).not.toBeNull();
    expect(gameReducer(s, { type: "MOVE_ROOM", roomId: "village_shop" })).toBe(s);
  });
});

describe("村庄：商店购买", () => {
  const shop = gameReducer(
    { ...initialGameState(), screen: "game" as const },
    { type: "MOVE_ROOM", roomId: "village_shop" }
  );

  it("BUY_ITEM：扣金币、加物品", () => {
    const s = gameReducer(shop, { type: "BUY_ITEM", itemId: "herb_bundle" });
    expect(s.player.inventory).toContainEqual({ itemId: "gold", quantity: 15 });
    expect(s.player.inventory).toContainEqual({ itemId: "herb_bundle", quantity: 1 });
  });

  it("BUY_ITEM：金币不足被拒", () => {
    const poor: GameState = {
      ...shop,
      player: {
        ...shop.player,
        inventory: shop.player.inventory.map((e) =>
          e.itemId === "gold" ? { itemId: "gold", quantity: 3 } : e
        ),
      },
    };
    expect(gameReducer(poor, { type: "BUY_ITEM", itemId: "health_potion" })).toBe(poor);
  });

  it("BUY_ITEM：非商店货架 / 非商店房间被拒", () => {
    // 广场不卖东西
    const square = { ...initialGameState(), screen: "game" as const };
    expect(gameReducer(square, { type: "BUY_ITEM", itemId: "herb_bundle" })).toBe(square);
    // 货架上没有的物品（铁剑）不可购买
    expect(gameReducer(shop, { type: "BUY_ITEM", itemId: "iron_sword" })).toBe(shop);
  });

  it("goldAmount：初始 20，商店支付后 15", () => {
    expect(goldAmount(shop.player)).toBe(20);
    const after = gameReducer(shop, { type: "BUY_ITEM", itemId: "mana_potion" });
    expect(goldAmount(after.player)).toBe(12);
  });
});
