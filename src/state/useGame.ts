import { useContext } from "react";
import { GameContext } from "./gameContextValue";

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
