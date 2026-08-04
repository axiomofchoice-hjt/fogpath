import type { GameState, GameAction, InventoryEntry } from "../types";
import { items as itemDefs } from "../data/items";
import { testBattleConfigs } from "../data/battleTestConfigs";
import { initBattle, resolveTurn } from "./battleEngine";

function addToInventory(
  inventory: InventoryEntry[],
  itemId: string,
  qty: number
): InventoryEntry[] {
  if (qty <= 0) return inventory;
  const idx = inventory.findIndex((e) => e.itemId === itemId);
  if (idx >= 0) {
    const updated = [...inventory];
    updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
    return updated;
  }
  return [...inventory, { itemId, quantity: qty }];
}

function removeFromInventory(
  inventory: InventoryEntry[],
  itemId: string,
  qty: number
): InventoryEntry[] {
  const idx = inventory.findIndex((e) => e.itemId === itemId);
  if (idx < 0) return inventory;
  const updated = [...inventory];
  const entry = updated[idx];
  if (entry.quantity <= qty) {
    updated.splice(idx, 1);
  } else {
    updated[idx] = { ...entry, quantity: entry.quantity - qty };
  }
  return updated;
}

function recalcStats(player: GameState["player"]): GameState["player"] {
  const atkBonus = player.equipment.reduce(
    (sum, id) => sum + (id ? itemDefs[id]?.atk ?? 0 : 0),
    0
  );
  const defBonus = player.equipment.reduce(
    (sum, id) => sum + (id ? itemDefs[id]?.def ?? 0 : 0),
    0
  );
  const spdBonus = player.equipment.reduce(
    (sum, id) => sum + (id ? itemDefs[id]?.spd ?? 0 : 0),
    0
  );
  return {
    ...player,
    atk: 10 + (player.lv - 1) * 2 + atkBonus,
    def: 5 + (player.lv - 1) * 1 + defBonus,
    spd: 8 + (player.lv - 1) * 1 + spdBonus,
  };
}

export function initialPlayer(): GameState["player"] {
  return recalcStats({
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    atk: 10,
    def: 5,
    spd: 8,
    lv: 1,
    exp: 0,
    gold: 20,
    currentRoomId: "village_square",
    inventory: [
      { itemId: "health_potion", quantity: 2 },
      { itemId: "apprentice_staff", quantity: 1 },
    ],
    equipment: ["rusty_sword", "rusty_shield", null, null, null, null],
    pickedItemIds: ["rusty_sword"],
  });
}

export function initialGameState(): GameState {
  return {
    screen: "start",
    player: initialPlayer(),
    battle: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      if (state.screen === "game") return state;
      return { ...state, screen: "game" };
    }

    case "BACK_TO_START": {
      if (state.screen === "start" || state.battle) return state;
      return { ...state, screen: "start" };
    }

    case "START_TEST_BATTLE": {
      if (state.battle) return state;
      const config = testBattleConfigs[action.scenarioId];
      if (!config) return state;
      return { ...state, battle: initBattle(action.scenarioId, state.player) };
    }

    case "BATTLE_ACT": {
      if (!state.battle) return state;
      return { ...state, battle: resolveTurn(state.battle, action.action) };
    }

    case "EXIT_BATTLE": {
      if (!state.battle) return state;
      return { ...state, battle: null };
    }
    case "PICKUP_ITEM": {
      const item = itemDefs[action.itemId];
      if (!item) return state;
      if (state.player.pickedItemIds.includes(action.itemId)) return state;
      return {
        ...state,
        player: {
          ...state.player,
          inventory: addToInventory(state.player.inventory, action.itemId, 1),
          pickedItemIds: [...state.player.pickedItemIds, action.itemId],
        },
      };
    }

    case "DISCARD_ITEM": {
      return {
        ...state,
        player: {
          ...state.player,
          inventory: removeFromInventory(state.player.inventory, action.itemId, 1),
        },
      };
    }

    case "EQUIP": {
      if (state.battle) return state;
      const item = itemDefs[action.itemId];
      if (!item || item.type !== "equipment") return state;
      if (state.player.equipment.includes(action.itemId)) return state;
      const slotIndex = state.player.equipment.indexOf(null);
      if (slotIndex === -1) return state;
      const equipment = [...state.player.equipment];
      equipment[slotIndex] = action.itemId;
      const newPlayer = recalcStats({
        ...state.player,
        equipment,
        inventory: removeFromInventory(state.player.inventory, action.itemId, 1),
      });
      return { ...state, player: newPlayer };
    }

    case "UNEQUIP": {
      const itemId = state.player.equipment[action.slotIndex];
      if (!itemId) return state;
      const equipment = [...state.player.equipment];
      equipment[action.slotIndex] = null;
      const newPlayer = recalcStats({
        ...state.player,
        equipment,
        inventory: addToInventory(state.player.inventory, itemId, 1),
      });
      return { ...state, player: newPlayer };
    }

    case "USE_ITEM": {
      const item = itemDefs[action.itemId];
      if (!item) return state;
      if (item.type === "consumable") {
        let newPlayer = { ...state.player };
        if (item.hpRestore) newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + item.hpRestore);
        if (item.mpRestore) newPlayer.mp = Math.min(newPlayer.maxMp, newPlayer.mp + item.mpRestore);
        newPlayer.inventory = removeFromInventory(newPlayer.inventory, action.itemId, 1);
        return { ...state, player: newPlayer };
      }
      return state;
    }

    case "REST": {
      return {
        ...state,
        player: { ...state.player, hp: state.player.maxHp, mp: state.player.maxMp },
      };
    }

    default:
      return state;
  }
}
