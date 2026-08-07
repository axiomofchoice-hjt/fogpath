import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initBattle, initBattleFromEnemies } from "../../state/battleEngine";
import { initialGameState, initialPlayer } from "../../state/gameReducer";
import type { GameState } from "../../types";

function withBattle(battle: ReturnType<typeof initBattle>): GameState {
  return { ...initialGameState(), screen: "game", battle };
}

describe("战斗视图", () => {
  it("装备提供动作：剑→普通攻击、盾→防御、休息无条件", () => {
    renderGame(withBattle(initBattle("test_atk_vs_atk", initialPlayer())));
    expect(screen.getByRole("button", { name: /普通攻击/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /防御/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /休息/ })).toBeInTheDocument();
  });

  it("装备覆盖：学徒木杖提供三个魔法动作并标注来源", () => {
    renderGame(withBattle(initBattle("test_magic_trio", initialPlayer())));
    expect(screen.getByRole("button", { name: /火球术/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /闪电术/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /岩石飞弹/ })).toBeInTheDocument();
    expect(screen.getAllByText("【学徒木杖】").length).toBeGreaterThan(0);
  });

  it("MP 不足：攻击/防御禁用、休息可用", () => {
    const player = { ...initialPlayer(), mp: 5 };
    renderGame(withBattle(initBattle("test_atk_vs_atk", player)));
    expect(screen.getByRole("button", { name: /普通攻击/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /防御/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /休息/ })).toBeEnabled();
  });

  it("出招后回合推进，属性槽随动作变化", async () => {
    const user = userEvent.setup();
    renderGame(withBattle(initBattle("test_atk_vs_atk", initialPlayer())));
    await user.click(screen.getByRole("button", { name: /普通攻击/ }));
    expect(screen.getByText("回合 1")).toBeInTheDocument();
    // 普通攻击消耗 10 MP（玩家卡片与侧栏均显示）
    expect(screen.getAllByText("90/100").length).toBeGreaterThan(0);
  });

  it("Boss 卡片带 Boss 徽标", () => {
    renderGame(withBattle(initBattleFromEnemies(["goblin_king"], initialPlayer())));
    expect(screen.getByTitle("Boss")).toBeInTheDocument();
  });

  it("测试战斗结算按钮：返回开始面板", () => {
    const battle = initBattle("test_atk_vs_atk", initialPlayer());
    renderGame(withBattle({ ...battle, result: "victory" }));
    expect(screen.getByRole("button", { name: "返回开始面板" })).toBeInTheDocument();
  });

  it("地牢战斗结算按钮：返回地牢", () => {
    const battle = initBattleFromEnemies(["goblin"], initialPlayer());
    renderGame(withBattle({ ...battle, result: "victory" }));
    expect(screen.getByRole("button", { name: "返回地牢" })).toBeInTheDocument();
  });
});
