import { createContext, type Dispatch } from "react";
import type { GameState, GameAction } from "../types";

export type GameContextValue = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
};

export const GameContext = createContext<GameContextValue | null>(null);
