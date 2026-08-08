import { useLayoutEffect, useReducer, useRef, type ReactNode } from "react";
import { GameContext } from "./gameContextValue";
import { gameReducer } from "./gameReducer";
import { initialGameState } from "./init";
import { saveGame, shouldAutoSave } from "./save";
import type { GameState } from "../types";

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    initialGameState()
  );

  // 自动存档：村庄安全屋内每次状态变化落盘。
  // 清档由 RESET_GAME 的 reducer 处理，这里不判断“初始态”，避免误清
  // （BACK_TO_START 返回的状态可能与初始态相同）。
  // 跳过条件：首次挂载（无前置状态）与 StrictMode 重复执行（前后引用相同）。
  const prevStateRef = useRef<GameState | null>(null);
  useLayoutEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (prev === null || prev === state) return;
    if (shouldAutoSave(state)) saveGame(state);
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}
