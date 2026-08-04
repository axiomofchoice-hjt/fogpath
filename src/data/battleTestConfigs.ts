export interface TestBattleConfig {
  enemies: string[];
}

/**
 * 测试场景 → 战斗配置；有配置的入口才会在开始面板启用。
 * 战斗严格使用玩家当前真实装备（无任何装备操作），所见即所得。
 */
export const testBattleConfigs: Record<string, TestBattleConfig> = {
  // 对撞机制：默认装备（生锈的剑 10/5 + 生锈的盾）
  test_atk_vs_atk: { enemies: ["goblin"] },
  test_atk_vs_guard: { enemies: ["goblin"] },
  test_atk_vs_rest: { enemies: ["goblin"] },
  // 动量压制：哥布林壮汉动量 7 > 剑 5，攻击被格挡
  test_clash_loss: { enemies: ["goblin_brute"] },
  // 多怪判定：整体对撞，玩家动量须大于所有怪
  test_goblins_x3: { enemies: ["goblin", "goblin", "goblin"] },
};
