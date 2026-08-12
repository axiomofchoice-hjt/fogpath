/* oxlint-disable react/only-export-components -- 测试工具箱：组件与渲染函数同文件 */
import { StrictMode, useReducer, type ReactNode } from "react";
import { render } from "@testing-library/react";
import { LanguageProvider } from "../i18n/LanguageContext";
import { GameContext } from "../state/gameContextValue";
import { gameReducer } from "../state/gameReducer";
import { initialGameState } from "../state/init";
import type { GameState } from "../types";
import { AppInner } from "../App";

/** 测试用 GameProvider：以给定初始状态启动，后续操作走真实 gameReducer */
export function TestGameProvider({
  initial,
  children,
}: {
  initial: GameState;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(gameReducer, initial);
  return (
    <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>
  );
}

/**
 * 渲染完整游戏（含侧栏/顶栏），初始状态可控。
 * 与 main.tsx 一致包 StrictMode：组件测试能捕获双执行类 bug
 * （reducer 已注入 seed 纯函数化；gameContext 自动存档有 StrictMode 跳过逻辑）。
 */
export function renderGame(initial: GameState = initialGameState()) {
  return render(
    <StrictMode>
      <LanguageProvider>
        <TestGameProvider initial={initial}>
          <AppInner />
        </TestGameProvider>
      </LanguageProvider>
    </StrictMode>
  );
}
