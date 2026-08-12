import { describe, expect, it } from "vitest";
import type { BattleState, Player } from "../types";
import {
  GUARD_MP,
  REST_MP,
  SHIELD_REDUCTION,
  initBattle,
  initBattleFromEnemies,
  pickPattern,
  resolveTurn,
} from "./battleEngine";
import { mulberry32 } from "./rng";
import { enemyDefs } from "../data/config";
import { initialPlayer } from "./init";

function testPlayer(overrides: Partial<Player> = {}): Player {
  return { ...initialPlayer(), ...overrides };
}

/** 强制指定敌人模式与步骤（模式随机选取不可控，测试需显式设定） */
function setPattern(
  battle: BattleState,
  index: number,
  patternId: string,
  stepIndex = 0
): BattleState {
  return {
    ...battle,
    enemies: battle.enemies.map((e, i) =>
      i === index ? { ...e, pattern: { patternId, stepIndex }, lastPatternId: null } : e
    ),
  };
}

describe("initBattle", () => {
  it("未知测试场景：启动即断言（不静默开始空战斗）", () => {
    expect(() => initBattle("no_such_scenario", testPlayer())).toThrow(/未知测试场景/);
  });

  it("默认装备提供普通攻击动作，识别盾牌减伤", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    expect(battle.playerActions).toEqual([
      { skillId: "basic_attack", damage: 10 },
    ]);
    expect(battle.guardReduction).toBe(SHIELD_REDUCTION);
    expect(battle.playerStats).toMatchObject({
      hp: 100,
      mp: 100,
      damage: 0,
      hasAttack: false,
    });
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

  it("敌人按场景初始化：从模式池随机起始，战斗开始为蓄势待发", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    expect(battle.enemies).toHaveLength(3);
    for (const e of battle.enemies) {
      expect(e).toMatchObject({
        defId: "goblin",
        hp: 30,
        hasAttack: false,
        maxDamage: 8,
        pattern: { stepIndex: 0 },
        lastPatternId: null,
      });
      expect(["combo", "heavy"]).toContain(e.pattern.patternId);
      expect(e.summary.zh).toContain("蓄势待发");
    }
  });
});

describe("pickPattern（模式选取与防重复）", () => {
  const patterns = [
    { id: "combo", weight: 10, steps: [{ kind: "charge" } as const] },
    { id: "heavy", weight: 6, steps: [{ kind: "charge" } as const] },
  ];

  it("加权随机：rng 0.3 → 无惩罚时选中 combo", () => {
    expect(pickPattern(patterns, null, () => 0.3).id).toBe("combo");
  });

  it("刚完成的模式权重 ×0.25 降档：rng 0.3 → 选中 heavy", () => {
    // 池权重 [2.5, 6]，总 8.5，roll = 2.55 → 越过 combo 选中 heavy
    expect(pickPattern(patterns, "combo", () => 0.3).id).toBe("heavy");
  });
});

describe("resolveTurn：蓄力回合", () => {
  it("蓄力回合：敌人无攻击属性，玩家全额命中", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo");
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(20); // 全额 10
    expect(next.playerStats.hp).toBe(100); // 蓄力不反击
    expect(next.playerStats.damage).toBe(10);
    expect(next.enemies[0]).toMatchObject({ damage: 0, hasAttack: false });
  });

  it("蓄力不可打断：蓄力回合被命中，下回合蓄力技照常释放", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo");
    const hit = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 哥布林 hp 20
    expect(hit.enemies[0].pattern).toEqual({ patternId: "combo", stepIndex: 1 });
    const next = resolveTurn(hit, { kind: "rest" }); // 蓄力技 14 伤害
    expect(next.enemies[0].hp).toBe(20);
    expect(next.playerStats.hp).toBe(100 - 14);
  });
});

describe("resolveTurn：蓄力技", () => {
  it("连击蓄力技（14）：压制玩家攻击，玩家被全数格挡", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo", 1);
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 10 vs 14 → 被格挡
    expect(next.enemies[0].hp).toBe(30);
    expect(next.playerStats.hp).toBe(100 - 14); // 怪全额命中
    expect(next.playerStats).toMatchObject({ damage: 0 });
    // 敌方为赢家：伤害显示满值 14
    expect(next.enemies[0]).toMatchObject({ damage: 14 });
  });

  it("重击（20）：压制玩家攻击，全额命中", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "heavy", 2);
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 10 vs 20 → 被格挡
    expect(next.enemies[0].hp).toBe(30);
    expect(next.playerStats.hp).toBe(100 - 20); // 重击 20 全额命中
    expect(next.enemies[0]).toMatchObject({ damage: 20 });
    expect(next.enemies[0].summary.zh).toContain("重击");
  });
});

describe("resolveTurn：对撞（伤害比较）", () => {
  it("伤害高者生效：玩家全额命中（蓄力怪无攻击，无对撞）", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo");
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 10 vs 蓄力(无攻击) → 必中
    expect(next.enemies[0].hp).toBe(20);
    expect(next.playerStats.hp).toBe(100);
    expect(next.playerStats.damage).toBe(10);
    expect(next.enemies[0]).toMatchObject({ damage: 0, hasAttack: false });
  });

  it("伤害被压制：攻击被全数格挡，敌方反击命中（10 vs 蓄力技 14）", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo", 1);
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(30); // 玩家攻击被格挡
    expect(next.playerStats.hp).toBe(100 - 14); // 怪命中
    expect(next.playerStats).toMatchObject({ damage: 0 });
    expect(next.enemies[0]).toMatchObject({ damage: 14 });
  });

  it("重击（20）：压制玩家攻击，全额命中", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "heavy", 2);
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(30);
    expect(next.playerStats.hp).toBe(100 - 20);
    expect(next.enemies[0]).toMatchObject({ damage: 20 });
    expect(next.enemies[0].summary.zh).toContain("重击");
  });

  it("伤害压制（壮汉 12）：玩家 10 被格挡，反击 12", () => {
    const battle = setPattern(initBattle("test_clash_loss", testPlayer()), 0, "press");
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 10 vs 12 → 被格挡
    expect(next.enemies[0].hp).toBe(45);
    expect(next.playerStats.hp).toBe(88);
    expect(next.playerStats).toMatchObject({ damage: 0 });
    expect(next.enemies[0]).toMatchObject({ damage: 12 });
  });

  it("伤害相等：双方攻击均被格挡（铁剑 12 vs 壮汉 12）", () => {
    const player = testPlayer({
      equipment: ["iron_sword", "rusty_shield", null, null, null, null],
    });
    const battle = setPattern(initBattle("test_clash_loss", player), 0, "press");
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(45);
    expect(next.playerStats.hp).toBe(100);
    expect(next.playerStats).toMatchObject({ damage: 0 });
    expect(next.enemies[0]).toMatchObject({ damage: 0 });
    expect(next.log.some((l) => l.zh.includes("格挡"))).toBe(true);
  });
});

describe("resolveTurn：防御与休息", () => {
  it("举盾减伤 50%，效果持续到下一次攻击前", () => {
    const battle = setPattern(initBattle("test_clash_loss", testPlayer()), 0, "press");
    const guarded = resolveTurn(battle, { kind: "guard" }); // 12×0.5=6
    expect(guarded.playerStats.mp).toBe(100 - GUARD_MP);
    expect(guarded.playerStats.hp).toBe(94);
    expect(guarded.shieldActive).toBe(true);
    // 休息：盾仍生效（壮汉第二刀 12×0.5=6），MP 恢复 10 封顶
    const rest = resolveTurn(guarded, { kind: "rest" });
    expect(rest.playerStats.hp).toBe(88);
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
    const battle = setPattern(initBattle("test_atk_vs_atk", player), 0, "combo", 1);
    const next = resolveTurn(battle, { kind: "guard" });
    expect(next.playerStats.hp).toBe(100 - 14);
    expect(next.playerSummary.zh).toContain("没有装备盾牌");
  });

  it("MP 不足时防御/攻击断言失败（UI 已禁用，防绕过不得静默）", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer({ mp: 5 }));
    expect(() => resolveTurn(battle, { kind: "guard" })).toThrow(/MP 不足/);
    expect(() =>
      resolveTurn(battle, { kind: "attack", skillId: "basic_attack", targetIndex: 0 })
    ).toThrow(/MP 不足/);
  });

  it("休息：全额挨打、恢复 MP、属性槽归零", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo", 1);
    const next = resolveTurn(battle, { kind: "rest" });
    expect(next.playerStats.hp).toBe(100 - 14);
    expect(next.playerStats.mp).toBe(100);
    expect(next.playerSummary.zh).toContain(`恢复了 ${REST_MP} 点 MP`);
    expect(next.playerStats).toMatchObject({ damage: 0, hasAttack: false });
  });
});

describe("resolveTurn：使用道具", () => {
  it("治疗药水回复战斗内 HP（蓄力回合无攻击，不受伤害）", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const hurt = {
      ...battle,
      playerStats: { ...battle.playerStats, hp: 50 },
    };
    const next = resolveTurn(hurt, { kind: "useItem", itemId: "health_potion" });
    expect(next.turn).toBe(1);
    expect(next.playerStats.hp).toBe(80); // 50+30
    expect(next.playerStats.hasAttack).toBe(false);
    expect(next.playerSummary.zh).toContain("治疗药水");
  });

  it("法力药水回复 MP（封顶）", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer({ mp: 30 }));
    const next = resolveTurn(battle, { kind: "useItem", itemId: "mana_potion" });
    expect(next.playerStats.mp).toBe(50); // 30+20
  });

  it("非消耗品 / 未知物品不可使用（断言失败，不静默）", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    expect(() => resolveTurn(battle, { kind: "useItem", itemId: "rusty_sword" })).toThrow(
      /只能使用有回复效果的消耗品/
    );
    expect(() => resolveTurn(battle, { kind: "useItem", itemId: "nope" })).toThrow(
      /只能使用有回复效果的消耗品/
    );
  });

  it("举盾后使用道具：不破盾，减伤仍生效", () => {
    const battle = setPattern(initBattle("test_clash_loss", testPlayer()), 0, "press");
    const guarded = resolveTurn(battle, { kind: "guard" }); // hp 94，shieldActive
    const next = resolveTurn(guarded, { kind: "useItem", itemId: "health_potion" });
    // 94+30 封顶 100，壮汉减伤 6 → 94
    expect(next.playerStats.hp).toBe(94);
    expect(next.shieldActive).toBe(true);
  });
});

describe("resolveTurn：多怪", () => {
  it("整体判定：玩家伤害须大于所有攻击怪的最高伤害，被压制则全数格挡", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const forced = battle.enemies.map((e) => ({
      ...e,
      pattern: { patternId: "combo", stepIndex: 1 },
      lastPatternId: null,
    })); // 三只攻击 14
    const next = resolveTurn({ ...battle, enemies: forced }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 1,
    }); // 10 vs max 14 → 被压制
    expect(next.enemies[1].hp).toBe(30);
    expect(next.playerStats.hp).toBe(100 - 14 * 3); // 三只哥布林全额命中
    expect(next.playerStats).toMatchObject({ damage: 0 });
  });

  it("逐怪单独判定：伤害 ≤ 玩家伤害的怪被格挡（含平局），高于玩家才命中", () => {
    const player = testPlayer({
      equipment: ["iron_sword", "rusty_shield", null, null, null, null],
    });
    const battle = initBattle("test_goblins_x3", player);
    const forced = [
      { ...battle.enemies[0], defId: "goblin", pattern: { patternId: "combo", stepIndex: 1 }, lastPatternId: null },        // 攻击 14
      { ...battle.enemies[1], defId: "goblin_brute", pattern: { patternId: "press", stepIndex: 0 }, lastPatternId: null },  // 攻击 12
      { ...battle.enemies[2], defId: "goblin", pattern: { patternId: "combo", stepIndex: 0 }, lastPatternId: null },        // 蓄力
    ];
    const next = resolveTurn({ ...battle, enemies: forced }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 12 vs max 14 → 玩家被格挡；逐怪：14>12 命中、12==12 平局被格挡
    expect(next.playerStats.hp).toBe(100 - 14);
    expect(next.enemies[0].hp).toBe(30); // 玩家攻击被格挡，未命中
    expect(next.enemies[1].damage).toBe(0); // 平局怪伤害显示 0（被格挡）
    expect(next.enemies[2].hp).toBe(30); // 蓄力怪不参与
  });

  it("只算攻击步的怪参与判定与反击，蓄力怪不攻击", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const forced = battle.enemies.map((e, i) => ({
      ...e,
      pattern:
        i === 0
          ? { patternId: "combo", stepIndex: 0 } // 蓄力
          : { patternId: "heavy", stepIndex: 2 }, // 重击 20
      lastPatternId: null,
    }));
    const next = resolveTurn({ ...battle, enemies: forced }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 10 vs max 20 → 被压制
    expect(next.playerStats.hp).toBe(100 - 20 * 2); // 两只重击怪各全额命中 20
  });

  it("全部蓄力：玩家必中目标，无怪反击", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const charging = battle.enemies.map((e) => ({
      ...e,
      pattern: { patternId: "combo", stepIndex: 0 },
      lastPatternId: null,
    }));
    const next = resolveTurn({ ...battle, enemies: charging }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 1,
    });
    expect(next.enemies[1].hp).toBe(20);
    expect(next.playerStats.hp).toBe(100);
  });

  it("休息/防御时全体攻击步的怪同时攻击，蓄力怪不攻击", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const attacking = battle.enemies.map((e) => ({
      ...e,
      pattern: { patternId: "combo", stepIndex: 1 },
      lastPatternId: null,
    }));
    const rest = resolveTurn({ ...battle, enemies: attacking }, { kind: "rest" });
    expect(rest.playerStats.hp).toBe(100 - 14 * 3);
    const guarded = resolveTurn({ ...battle, enemies: attacking }, { kind: "guard" });
    expect(guarded.playerStats.hp).toBe(100 - 7 * 3);

    const charging = battle.enemies.map((e) => ({
      ...e,
      pattern: { patternId: "combo", stepIndex: 0 },
      lastPatternId: null,
    }));
    const restCharging = resolveTurn({ ...battle, enemies: charging }, { kind: "rest" });
    expect(restCharging.playerStats.hp).toBe(100);
  });
});

describe("resolveTurn：模式推进", () => {
  it("模式步进：蓄力 → 攻击步", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo");
    const next = resolveTurn(battle, { kind: "rest" });
    expect(next.enemies[0].pattern).toEqual({ patternId: "combo", stepIndex: 1 });
  });

  it("模式完成：选取下一个模式并记录 lastPatternId", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo", 1);
    const next = resolveTurn(battle, { kind: "rest" });
    expect(next.enemies[0].lastPatternId).toBe("combo");
    expect(next.enemies[0].pattern.stepIndex).toBe(0);
    expect(["combo", "heavy"]).toContain(next.enemies[0].pattern.patternId);
  });
});

describe("resolveTurn：胜负与边界", () => {
  it("目标已死：攻击落空，不误报格挡", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const dead = {
      ...battle,
      enemies: battle.enemies.map((e, i) =>
        i === 0 ? { ...e, hp: 0 } : { ...e, pattern: { patternId: "combo", stepIndex: 0 }, lastPatternId: null }
      ),
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

  it("未装备的技能不可使用：断言失败（不消耗回合与 MP，但不静默）", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    expect(() =>
      resolveTurn(battle, { kind: "attack", skillId: "fireball", targetIndex: 0 })
    ).toThrow(/未装备的技能/);
  });

  it("胜利：击杀全部敌人", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo");
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
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer({ hp: 5 })), 0, "combo", 1);
    const next = resolveTurn(battle, { kind: "rest" });
    expect(next.playerStats.hp).toBe(0);
    expect(next.result).toBe("defeat");
  });

  it("剩余敌人为 0 优先于玩家 HP 判定（同归于尽防御性判胜利）", () => {
    // 构造防御性状态：敌人全灭 + 玩家 HP 0 而战斗未结算——判定顺序锁定 remaining===0 → victory
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const finished: BattleState = {
      ...battle,
      playerStats: { ...battle.playerStats, hp: 0 },
      enemies: [{ ...battle.enemies[0], hp: 0 }],
      result: "ongoing",
    };
    const next = resolveTurn(finished, { kind: "rest" });
    expect(next.playerStats.hp).toBe(0);
    expect(next.result).toBe("victory");
  });

  it("模式推进随机选取：同 seed 两次推进结果一致（引擎确定性）", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo", 1);
    const a = resolveTurn(battle, { kind: "rest" }, mulberry32(9));
    const b = resolveTurn(battle, { kind: "rest" }, mulberry32(9));
    expect(a.enemies[0].pattern).toEqual(b.enemies[0].pattern);
    expect(a.enemies[0].lastPatternId).toBe("combo");
  });

  it("战斗结束后动作无效", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const finished = { ...battle, result: "victory" as const };
    expect(
      resolveTurn(finished, { kind: "attack", skillId: "basic_attack", targetIndex: 0 })
    ).toBe(finished);
  });

  it("resolveTurn 不修改原状态", () => {
    const battle = initBattle("test_atk_vs_atk", testPlayer());
    const snapshot = JSON.parse(JSON.stringify(battle));
    resolveTurn(battle, { kind: "attack", skillId: "basic_attack", targetIndex: 0 });
    resolveTurn(battle, { kind: "guard" });
    resolveTurn(battle, { kind: "rest" });
    expect(battle).toEqual(snapshot);
  });
});

describe("goblin_camp_watch（哨戒哥布林固定循环）", () => {
  it("10 回合行为序列 = 循环① [普,普,蓄,重,蓄,重,普,蓄,重] 并回到循环起点", () => {
    // 玩家高 HP 只休息：观察敌方固定行为，不受胜败干扰
    const battle = initBattleFromEnemies(
      ["goblin_camp_watch"],
      testPlayer({ hp: 99999, maxHp: 99999 })
    );
    const expected: string[] = [
      "哥布林使用了普通攻击！",
      "哥布林使用了普通攻击！",
      "哥布林正在蓄力…",
      "哥布林使用了重击！",
      "哥布林正在蓄力…",
      "哥布林使用了重击！",
      "哥布林使用了普通攻击！",
      "哥布林正在蓄力…",
      "哥布林使用了重击！",
      "哥布林使用了普通攻击！", // 第 10 回合：回到循环起点
    ];
    let cur = battle;
    const summaries: string[] = [];
    for (let i = 0; i < 10; i++) {
      cur = resolveTurn(cur, { kind: "rest" });
      summaries.push(cur.enemies[0].summary.zh);
    }
    expect(summaries).toEqual(expected);
    // 模式 id 不变（单模式池）：第 10 回合执行完循环第 1 步，推进后在第 2 步
    expect(cur.enemies[0].pattern.patternId).toBe("loop");
    expect(cur.enemies[0].pattern.stepIndex).toBe(1);
  });

  it("教学哥布林与普通哥布林动作集统一：哥布林【普通攻击】【蓄力→重击】", () => {
    const watch = enemyDefs.goblin_camp_watch;
    const goblin = enemyDefs.goblin;
    expect(watch.moves).toEqual(goblin.moves);
    expect(watch.moves).toEqual([
      { name: { zh: "普通攻击", en: "Basic Attack" }, charge: 0 },
      { name: { zh: "重击", en: "Heavy Blow" }, charge: 1 },
    ]);
  });
});
