import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "../i18n/LanguageContext";
import { TestGameProvider } from "../test/harness";
import { initialGameState } from "../state/init";
import { GameErrorBoundary } from "./ErrorBoundary";

function Bomb(): ReactNode {
  throw new Error("boom");
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
});
