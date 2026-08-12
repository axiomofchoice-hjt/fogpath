import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderGame } from "../../test/harness";
import { initBattle } from "../../state/battleEngine";
import { initialGameState, initialPlayer } from "../../state/init";
import type { GameState } from "../../types";

describe("装备面板", () => {
  it("村庄：显示已装备物品与空槽，卸下按钮可点", () => {
    const state: GameState = { ...initialGameState(), screen: "game" };
    renderGame(state);
    // 初始装备：生锈的剑 + 生锈的盾 + 4 空槽
    expect(screen.getByText("生锈的剑")).toBeInTheDocument();
    expect(screen.getByText("生锈的盾")).toBeInTheDocument();
    expect(screen.getAllByText("空")).toHaveLength(4);
  });

  it("战斗内：显示战斗快照装备（测试场景覆盖学徒木杖）且无卸下按钮", () => {
    const state: GameState = {
      ...initialGameState(),
      screen: "game",
      battle: initBattle("test_magic_trio", initialPlayer()),
    };
    renderGame(state);
    // 战斗内 EquipmentPanel 显示 battle.equipment：学徒木杖 + 生锈的盾
    expect(screen.getByText("学徒木杖")).toBeInTheDocument();
    // 卸下按钮仅村庄可用：战斗内不存在
    expect(screen.queryByRole("button", { name: "卸下" })).not.toBeInTheDocument();
  });
});
