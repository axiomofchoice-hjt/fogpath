import type { GameAction, GameState } from "../types";
import { screenReducer } from "./screenReducer";
import { playerReducer } from "./playerReducer";
import { battleReducer } from "./battleReducer";
import { dungeonReducer } from "./dungeonReducer";

/** 各域 reducer 按序尝试处理动作：处理者返回新状态，未处理返回原状态 */
const reducers = [screenReducer, playerReducer, battleReducer, dungeonReducer];

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "LOAD_SAVE") {
    // 防御：历史/异常存档若停留在开始屏，强制恢复进游戏（存档只应在村庄生成）
    if (action.save.screen === "start") return { ...action.save, screen: "game" };
    return action.save;
  }
  for (const reducer of reducers) {
    const next = reducer(state, action);
    if (next !== state) return next;
  }
  return state;
}
