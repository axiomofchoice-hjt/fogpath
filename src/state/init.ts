import type { GameState, Player } from "../types";
import { EQUIP_SLOT_COUNT } from "../types";
import { GOLD_ID } from "./helpers";

const START_EQUIPMENT: (string | null)[] = [
  "rusty_sword",
  "rusty_shield",
  ...Array.from({ length: EQUIP_SLOT_COUNT - 2 }, () => null),
];

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
    equipment: START_EQUIPMENT,
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
