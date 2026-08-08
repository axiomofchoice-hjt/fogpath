import type { GameAction, GameState } from "../types";
import { initialGameState } from "./init";
import { clearSave } from "./save";

/** 屏幕切换：开始面板 / 主游戏（RESET 需无战斗） */
export function screenReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      if (state.screen === "game") return state;
      return { ...state, screen: "game" };
    }

    case "BACK_TO_START": {
      if (state.screen === "start" || state.battle) return state;
      // 保留玩家状态：测试战斗的 HP/MP 损耗在此延续
      return { ...state, screen: "start" };
    }

    case "RESET_GAME": {
      if (state.battle) return state;
      // 真正的重新开始才清档（BACK_TO_START 返回的状态可能与初始态相同，不能用状态比对判断）
      clearSave();
      return initialGameState();
    }

    default:
      return state;
  }
}
