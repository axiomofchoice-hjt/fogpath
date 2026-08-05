import { describe, expect, it } from "vitest";
import type { Player } from "../types";
import { GUARD_MP, REST_MP, SHIELD_REDUCTION, initBattle, resolveTurn } from "./battleEngine";
import { initialPlayer } from "./gameReducer";

function testPlayer(overrides: Partial<Player> = {}): Player {
  return { ...initialPlayer(), ...overrides };
}

describe("initBattle", () => {
  it("默认装备提供普通攻击动作，识别盾牌减伤", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    expect(battle.playerActions).toEqual([
      { skillId: "basic_attack", damage: 10, momentum: 5 },
    ]);
    expect(battle.guardReduction).toBe(SHIELD_REDUCTION);
    expect(battle.playerStats).toMatchObject({ hp: 100, mp: 100, damage: 0, momentum: 0, hasAttack: false });
    expect(battle.turn).toBe(0);
    expect(battle.result).toBe("ongoing");
  });

  it("无盾装备时减伤为 0", () => {
    const player = testPlayer({ equipment: ["rusty_sword", null, null, null, null, null] });
    expect(initBattle("test_atk_vs_atk", player).guardReduction).toBe(0);
  });

  it("场景装备覆盖：学徒木杖提供三个魔法动作", () => {
    const battle = initBattle("test_magic_trio", testPlayer());
    expect(battle.playerActions.map((a) => a.skillId)).toEqual([
      "fireball",
      "lightning",
      "rock_bolt",
    ]);
    expect(battle.equipment[0]).toBe("apprentice_staff");
  });

  it("敌人按场景初始化", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    expect(battle.enemies).toHaveLength(3);
    expect(battle.enemies[0]).toMatchObject({
      defId: "goblin",
      hp: 30,
      maxDamage: 8,
      maxMomentum: 4,
      hasAttack: false,
    });
  });
});

describe("resolveTurn：攻击对撞", () => {
  it("动量大者生效：命中 10-4=6，扣 MP 10，对撞后动量互相扣减", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.turn).toBe(1);
    expect(next.playerStats.mp).toBe(100 - 10);
    expect(next.enemies[0].hp).toBe(24);
    expect(next.playerStats.hasAttack).toBe(true);
    // 玩家 min(5, 4)=4 → 动量 1、伤害 10-4=6；怪 min(4, 5)=4 → 动量 0、伤害 8-4=4
    expect(next.playerStats.momentum).toBe(1);
    expect(next.playerStats.damage).toBe(6);
    expect(next.enemies[0].momentum).toBe(0);
    expect(next.enemies[0].damage).toBe(4);
    expect(next.result).toBe("ongoing");
    expect(next.log.some((l) => l.zh.includes("命中"))).toBe(true);
  });

  it("动量被压制：攻击被格挡，敌方反击 12-6=6", () => {
    const battle = initBattle("test_clash_loss", testPlayer());
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(45);
    expect(next.playerStats.hp).toBe(94);
    expect(next.playerStats.momentum).toBe(0);
    expect(next.playerStats.damage).toBe(5);
    expect(next.log.some((l) => l.zh.includes("格挡"))).toBe(true);
  });

  it("目标已死：攻击落空，不误报格挡", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const dead = {
      ...battle,
      enemies: battle.enemies.map((e, i) => (i === 0 ? { ...e, hp: 0 } : e)),
    };
    const next = resolveTurn(dead, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.log.some((l) => l.zh.includes("落空"))).toBe(true);
    expect(next.log.some((l) => l.zh.includes("格挡"))).toBe(false);
    expect(next.enemies[1].hp).toBe(30);
  });

  it("未装备的技能不可使用：不消耗回合与 MP", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    expect(
      resolveTurn(battle, { kind: "attack", skillId: "fireball", targetIndex: 0 })
    ).toBe(battle);
  });

  it("MP 不足时攻击被拒", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer({ mp: 5 }));
    expect(
      resolveTurn(battle, { kind: "attack", skillId: "basic_attack", targetIndex: 0 })
    ).toBe(battle);
  });

  it("胜利：击杀全部敌人", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const weakened = { ...battle, enemies: [{ ...battle.enemies[0], hp: 1 }] };
    const next = resolveTurn(weakened, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(0);
    expect(next.result).toBe("victory");
  });

  it("失败：玩家 HP 归零", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer({ hp: 5 }));
    const next = resolveTurn(battle, { kind: "rest" });
    expect(next.playerStats.hp).toBe(0);
    expect(next.result).toBe("defeat");
  });

  it("战斗结束后动作无效", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const finished = { ...battle, result: "victory" as const };
    expect(
      resolveTurn(finished, { kind: "attack", skillId: "basic_attack", targetIndex: 0 })
    ).toBe(finished);
  });
});

describe("resolveTurn：防御与休息", () => {
  it("举盾减伤 50%：MP-10、受伤 4，效果持续到下一次攻击前", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const next = resolveTurn(battle, { kind: "guard" });
    expect(next.playerStats.mp).toBe(100 - GUARD_MP);
    expect(next.playerStats.hp).toBe(96);
    expect(next.shieldActive).toBe(true);
    // 下一回合休息：盾仍生效，减伤 4；MP 恢复 50 封顶 100
    const rest = resolveTurn(next, { kind: "rest" });
    expect(rest.playerStats.hp).toBe(92);
    expect(rest.playerStats.mp).toBe(100);
    // 出手攻击即破盾
    const attack = resolveTurn(rest, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(attack.shieldActive).toBe(false);
  });

  it("无盾防御：无减伤，摘要提示未装备盾牌", () => {
    const player = testPlayer({ equipment: ["rusty_sword", null, null, null, null, null] });
    const battle = initBattle("test_atk_vs_atk", player);
    const next = resolveTurn(battle, { kind: "guard" });
    expect(next.playerStats.hp).toBe(92);
    expect(next.playerSummary.zh).toContain("没有装备盾牌");
  });

  it("MP 不足时防御被拒", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer({ mp: 5 }));
    expect(resolveTurn(battle, { kind: "guard" })).toBe(battle);
  });

  it("休息：全额挨打、恢复 MP、属性槽归零", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const next = resolveTurn(battle, { kind: "rest" });
    expect(next.playerStats.hp).toBe(92);
    expect(next.playerStats.mp).toBe(100);
    expect(next.playerSummary.zh).toContain(`恢复了 ${REST_MP} 点 MP`);
    expect(next.playerStats).toMatchObject({ damage: 0, momentum: 0, hasAttack: false });
  });
});

describe("resolveTurn：多怪", () => {
  it("整体判定：动量须大于所有怪，命中后伤害按最大动量计算", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 1,
    });
    expect(next.enemies[1].hp).toBe(24);
    expect(next.enemies[0].hp).toBe(30);
    // 玩家动量变化量 = min(5, 4*3) = 5
    expect(next.playerStats.momentum).toBe(0);
    expect(next.playerStats.damage).toBe(5);
    expect(next.playerStats.hp).toBe(100);
  });

  it("防御/休息时全体怪同时攻击", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const rest = resolveTurn(battle, { kind: "rest" });
    expect(rest.playerStats.hp).toBe(100 - 8 * 3);
    const guarded = resolveTurn(battle, { kind: "guard" });
    expect(guarded.playerStats.hp).toBe(100 - 4 * 3);
  });
});

describe("resolveTurn：不可变性", () => {
  it("不修改原状态", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const snapshot = JSON.parse(JSON.stringify(battle));
    resolveTurn(battle, { kind: "attack", skillId: "basic_attack", targetIndex: 0 });
    resolveTurn(battle, { kind: "guard" });
    resolveTurn(battle, { kind: "rest" });
    expect(battle).toEqual(snapshot);
  });
});
