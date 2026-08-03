export interface TestBattleConfig {
  enemies: string[];
}

/** 测试场景 → 战斗配置；有配置的入口才会在开始面板启用 */
export const testBattleConfigs: Record<string, TestBattleConfig> = {
  test_atk_vs_atk: { enemies: ["goblin"] },
};
