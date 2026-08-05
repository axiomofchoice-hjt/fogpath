import { useReducer, type ReactNode } from "react";
import { GameContext } from "./gameContextValue";
import { initialGameState, gameReducer } from "./gameReducer";

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    initialGameState()
  );

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}
