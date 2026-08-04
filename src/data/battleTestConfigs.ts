export interface TestBattleConfig {
  enemies: string[];
  /** 测试用装备覆盖：直接指定战斗内装备（动作随覆盖装备出现），不改玩家状态 */
  equipment?: (string | null)[];
}

/** 测试场景 → 战斗配置；有配置的入口才会在开始面板启用 */
export const testBattleConfigs: Record<string, TestBattleConfig> = {
  // 对撞机制：默认装备（生锈的剑 10/5 + 生锈的盾）
  test_atk_vs_atk: { enemies: ["goblin"] },
  test_atk_vs_guard: { enemies: ["goblin"] },
  test_atk_vs_rest: { enemies: ["goblin"] },
  // 动量压制：哥布林壮汉动量 7 > 剑 5，攻击被格挡
  test_clash_loss: { enemies: ["goblin_brute"] },
  // 魔法动作：直接覆盖装备为学徒木杖，提供火球术/闪电术/岩石飞弹
  test_magic_trio: {
    enemies: ["goblin"],
    equipment: ["apprentice_staff", "rusty_shield", null, null, null, null],
  },
  // 多怪判定：整体对撞，玩家动量须大于所有怪
  test_goblins_x3: { enemies: ["goblin", "goblin", "goblin"] },
};
