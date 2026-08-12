import type { GameAction, GameState } from "../types";
import { initialGameState } from "./init";
import { assertInvariant } from "./helpers";

/** 屏幕切换：开始面板 / 主游戏（RESET 需无战斗） */
export function screenReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      if (state.screen === "game") return state; // 幂等守卫：已在游戏
      return { ...state, screen: "game" };
    }

    case "BACK_TO_START": {
      assertInvariant(state.screen !== "start", "BACK_TO_START 已在开始面板");
      assertInvariant(!state.battle, "BACK_TO_START 不能在战斗中使用");
      // 保留玩家状态：测试战斗的 HP/MP 损耗在此延续
      return { ...state, screen: "start" };
    }

    case "RESET_GAME": {
      // 战斗进行中清档会使战斗/存档失效，属调用方错误：直接断言失败而非静默无操作
      if (state.battle) throw new Error("RESET_GAME 不能在战斗中使用");
      // 清档副作用（localStorage）由调用方在 dispatch 前执行（reducer 保持纯函数）
      return initialGameState();
    }

    default:
      return state;
  }
}
