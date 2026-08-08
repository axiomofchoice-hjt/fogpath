/* oxlint-disable react/only-export-components -- 测试组件与测试同文件 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, type ReactNode } from "react";
import { GameProvider } from "./gameContext";
import { useGame } from "./useGame";
import { initialPlayer } from "./init";
import { SAVE_KEY, loadSave, saveGame } from "./save";
import type { GameAction, GameState } from "../types";

function villageGameState(): GameState {
  return {
    screen: "game",
    player: {
      ...initialPlayer(),
      hp: 66,
      inventory: [{ itemId: "gold", quantity: 55 }],
    },
    battle: null,
    dungeon: null,
  };
}

/** 通过按钮派发动作，观察 provider 的自动存档副作用 */
function Probe({ actions }: { actions: { label: string; action: () => GameAction }[] }) {
  const { state, dispatch } = useGame();
  return (
    <div>
      <span data-testid="screen">{state.screen}</span>
      {actions.map((a) => (
        <button key={a.label} onClick={() => dispatch(a.action())}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

function renderProvider(children: ReactNode) {
  return render(<StrictMode><GameProvider>{children}</GameProvider></StrictMode>);
}

beforeEach(() => {
  localStorage.clear();
});

describe("GameProvider 自动存档副作用", () => {
  it("挂载（含 StrictMode 双执行）不清除已有存档", () => {
    saveGame(villageGameState());
    renderProvider(<Probe actions={[]} />);
    expect(loadSave()).toEqual(villageGameState());
  });

  it("进入村庄（安全屋）自动写入存档", async () => {
    const user = userEvent.setup();
    renderProvider(
      <Probe actions={[{ label: "start", action: () => ({ type: "START_GAME" }) }]} />
    );
    await user.click(screen.getByRole("button", { name: "start" }));
    await waitFor(() => expect(loadSave()?.screen).toBe("game"));
  });

  it("RESET_GAME 清除存档", async () => {
    const user = userEvent.setup();
    saveGame(villageGameState());
    renderProvider(
      <Probe actions={[{ label: "reset", action: () => ({ type: "RESET_GAME" }) }]} />
    );
    await user.click(screen.getByRole("button", { name: "reset" }));
    await waitFor(() => expect(localStorage.getItem(SAVE_KEY)).toBeNull());
  });

  it("测试战斗（非安全屋）不写入存档", async () => {
    const user = userEvent.setup();
    renderProvider(
      <Probe
        actions={[{ label: "battle", action: () => ({ type: "START_TEST_BATTLE", scenarioId: "test_atk_vs_atk" }) }]}
      />
    );
    await user.click(screen.getByRole("button", { name: "battle" }));
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });
});
