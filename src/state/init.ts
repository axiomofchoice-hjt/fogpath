import type { GameState, Player } from "../types";
import { GOLD_ID } from "./helpers";

export function initialPlayer(): Player {
  return {
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    currentRoomId: "village_square",
    inventory: [
      { itemId: GOLD_ID, quantity: 20 },
      { itemId: "health_potion", quantity: 2 },
    ],
    equipment: ["rusty_sword", "rusty_shield", null, null, null, null],
    pickedItemIds: ["rusty_sword"],
    hasPet: false,
  };
}

export function initialGameState(): GameState {
  return {
    screen: "start",
    player: initialPlayer(),
    battle: null,
    dungeon: null,
  };
}
