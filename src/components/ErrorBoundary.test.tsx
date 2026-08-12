import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { LanguageProvider } from "../i18n/LanguageContext";
import { TestGameProvider } from "../test/harness";
import { initialGameState, initialPlayer } from "../state/init";
import { gameReducer } from "../state/gameReducer";
import { useGame } from "../state/useGame";
import type { GameState } from "../types";
import { GameErrorBoundary } from "./ErrorBoundary";

function Bomb(): ReactNode {
  throw new Error("boom");
}

/** 状态相关炸弹：HP 过低时崩溃（模拟坏存档导致的渲染崩溃） */
function StateBomb(): ReactNode {
  const { state } = useGame();
  if (state.player.hp < 50) throw new Error("hp too low");
  return <div>恢复正常</div>;
}

/** 战斗炸弹：战斗中崩溃（模拟战斗渲染崩溃） */
function BattleBomb(): ReactNode {
  const { state } = useGame();
  if (state.battle) throw new Error("battle boom");
  return <div>正常内容</div>;
}

describe("错误边界", () => {
  it("渲染崩溃时展示错误面板，正常内容不显示", () => {
    render(
      <LanguageProvider>
        <TestGameProvider initial={initialGameState()}>
          <GameErrorBoundary>
            <Bomb />
          </GameErrorBoundary>
        </TestGameProvider>
      </LanguageProvider>
    );
    expect(screen.getByText("游戏出错")).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新页面" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置进度" })).toBeInTheDocument();
  });

  it("无错误时正常渲染子内容", () => {
    render(
      <LanguageProvider>
        <TestGameProvider initial={initialGameState()}>
          <GameErrorBoundary>
            <div>正常内容</div>
          </GameErrorBoundary>
        </TestGameProvider>
      </LanguageProvider>
    );
    expect(screen.getByText("正常内容")).toBeInTheDocument();
    expect(screen.queryByText("游戏出错")).not.toBeInTheDocument();
  });

  it("点击重置进度：清除错误面板，重置后不再崩溃", async () => {
    const user = userEvent.setup();
    const broken: GameState = {
      ...initialGameState(),
      screen: "game",
      player: { ...initialPlayer(), hp: 30 },
    };
    render(
      <LanguageProvider>
        <TestGameProvider initial={broken}>
          <GameErrorBoundary>
            <StateBomb />
          </GameErrorBoundary>
        </TestGameProvider>
      </LanguageProvider>
    );
    expect(screen.getByText("游戏出错")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重置进度" }));
    expect(screen.queryByText("游戏出错")).not.toBeInTheDocument();
    expect(screen.getByText("恢复正常")).toBeInTheDocument();
  });

  it("战斗中崩溃：重置进度按钮禁用（RESET_GAME 战斗中断言失败）", () => {
    const inBattle = gameReducer(initialGameState(), {
      type: "START_TEST_BATTLE",
      scenarioId: "test_atk_vs_atk",
      seed: 1,
    });
    render(
      <LanguageProvider>
        <TestGameProvider initial={inBattle}>
          <GameErrorBoundary>
            <BattleBomb />
          </GameErrorBoundary>
        </TestGameProvider>
      </LanguageProvider>
    );
    expect(screen.getByText("游戏出错")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置进度" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刷新页面" })).toBeEnabled();
  });
});
