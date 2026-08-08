import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { renderGame } from "../../test/harness";
import { GameProvider } from "../../state/gameContext";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { initialPlayer } from "../../state/init";
import { saveGame } from "../../state/save";
import { AppInner } from "../../App";
import type { GameState } from "../../types";

function villageSave(): GameState {
  return {
    screen: "game",
    player: { ...initialPlayer(), hp: 66, inventory: [{ itemId: "gold", quantity: 55 }] },
    battle: null,
    dungeon: null,
  };
}

/** 真实 GameProvider（含自动存档副作用）+ StrictMode，复现 dev 环境行为 */
function renderStartPanelWithSave(save: GameState) {
  saveGame(save);
  return render(
    <StrictMode>
      <LanguageProvider>
        <GameProvider>
          <AppInner />
        </GameProvider>
      </LanguageProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("开始面板", () => {
  it("进入村庄：切换到村庄广场视图", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← 开始面板" })).toBeInTheDocument();
  });

  it("测试战斗入口：点击场景进入战斗视图，装备动作按钮齐全", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: /攻击 vs 攻击/ }));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
    // 默认装备：剑提供普通攻击、盾提供防御、休息无条件
    expect(screen.getByRole("button", { name: /普通攻击/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /防御/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /休息/ })).toBeInTheDocument();
  });

  it("返回按钮回到开始面板后，可再次进入村庄", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    await user.click(screen.getByRole("button", { name: "← 开始面板" }));
    expect(screen.getByRole("button", { name: "进入村庄" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
  });

  it("有存档时显示「继续冒险」，点击进入村庄", async () => {
    const user = userEvent.setup();
    renderStartPanelWithSave(villageSave());
    expect(screen.getByText("上次存档")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "继续冒险" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
  });

  it("进入村庄后返回开始面板：存档保留，「继续冒险」仍可用", async () => {
    const user = userEvent.setup();
    renderStartPanelWithSave(villageSave());
    await user.click(screen.getByRole("button", { name: "继续冒险" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();

    // 未做任何改动直接返回：状态与初始态相同，但存档必须保留
    await user.click(screen.getByRole("button", { name: "← 开始面板" }));
    expect(screen.getByRole("button", { name: "继续冒险" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "进入村庄" })
    ).not.toBeInTheDocument();

    // 可再次继续冒险
    await user.click(screen.getByRole("button", { name: "继续冒险" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
  });

  it("无存档进入村庄后返回：自动存档生效，「继续冒险」应显示", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <LanguageProvider>
          <GameProvider>
            <AppInner />
          </GameProvider>
        </LanguageProvider>
      </StrictMode>
    );
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "← 开始面板" }));
    expect(screen.getByRole("button", { name: "继续冒险" })).toBeInTheDocument();
  });

  it("重新开始清档后，「继续冒险」按钮同步消失，可正常新游戏", async () => {
    const user = userEvent.setup();
    renderStartPanelWithSave(villageSave());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "继续冒险" })).toBeInTheDocument()
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "重新开始（清空进度）" }));
    // 存档已清空：按钮应变为「进入村庄」，残留的「继续冒险」必须消失
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "进入村庄" })).toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: "继续冒险" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
  });
});
