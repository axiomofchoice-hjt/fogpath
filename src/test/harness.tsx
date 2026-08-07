/* oxlint-disable react/only-export-components -- 测试工具箱：组件与渲染函数同文件 */
import { useReducer, type ReactNode } from "react";
import { render } from "@testing-library/react";
import { LanguageProvider } from "../i18n/LanguageContext";
import { GameContext } from "../state/gameContextValue";
import { gameReducer, initialGameState } from "../state/gameReducer";
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

/** 渲染完整游戏（含侧栏/顶栏），初始状态可控 */
export function renderGame(initial: GameState = initialGameState()) {
  return render(
    <LanguageProvider>
      <TestGameProvider initial={initial}>
        <AppInner />
      </TestGameProvider>
    </LanguageProvider>
  );
}
