import type { GameAction, GameState } from "../types";
import { screenReducer } from "./screenReducer";
import { playerReducer } from "./playerReducer";
import { battleReducer } from "./battleReducer";
import { dungeonReducer } from "./dungeonReducer";

/** 各域 reducer 按序尝试处理动作：处理者返回新状态，未处理返回原状态 */
const reducers = [screenReducer, playerReducer, battleReducer, dungeonReducer];

export function gameReducer(state: GameState, action: GameAction): GameState {
  for (const reducer of reducers) {
    const next = reducer(state, action);
    if (next !== state) return next;
  }
  return state;
}
