import type { GameAction, GameState } from "../types";
import { items as itemDefs, rooms as roomMap } from "../data/config";
import { addToInventory, goldAmount, removeFromInventory } from "./helpers";

/** 玩家/村庄域：房间移动、商店、拾取/丢弃、装备、非战斗用道具 */
export function playerReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "MOVE_ROOM": {
      if (state.battle) return state;
      const room = roomMap[state.player.currentRoomId];
      if (!room || !room.exits.includes(action.roomId)) return state;
      if (!roomMap[action.roomId]) return state;
      return {
        ...state,
        player: { ...state.player, currentRoomId: action.roomId },
      };
    }

    case "BUY_ITEM": {
      if (state.battle) return state;
      const room = roomMap[state.player.currentRoomId];
      const entry = room?.shopItems?.find((s) => s.itemId === action.itemId);
      if (!entry) return state;
      const item = itemDefs[action.itemId];
      if (!item) return state;
      const gold = goldAmount(state.player);
      if (gold < entry.price) return state;
      return {
        ...state,
        player: {
          ...state.player,
          inventory: [
            ...removeFromInventory(state.player.inventory, "gold", entry.price),
            ...addToInventory(state.player.inventory, action.itemId, 1),
          ],
        },
      };
    }

    case "PICKUP_ITEM": {
      if (state.battle) return state;
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
      if (state.battle) return state;
      // 货币不可丢弃
      if (itemDefs[action.itemId]?.type === "currency") return state;
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
      return {
        ...state,
        player: {
          ...state.player,
          equipment,
          inventory: removeFromInventory(state.player.inventory, action.itemId, 1),
        },
      };
    }

    case "UNEQUIP": {
      if (state.battle) return state;
      const itemId = state.player.equipment[action.slotIndex];
      if (!itemId) return state;
      const equipment = [...state.player.equipment];
      equipment[action.slotIndex] = null;
      return {
        ...state,
        player: {
          ...state.player,
          equipment,
          inventory: addToInventory(state.player.inventory, itemId, 1),
        },
      };
    }

    case "USE_ITEM": {
      // 战斗中的使用道具由 battleReducer 处理（消耗一回合）
      if (state.battle) return state;
      const item = itemDefs[action.itemId];
      if (!item || item.type !== "consumable") return state;
      let newPlayer = { ...state.player };
      if (item.hpRestore) newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + item.hpRestore);
      if (item.mpRestore) newPlayer.mp = Math.min(newPlayer.maxMp, newPlayer.mp + item.mpRestore);
      newPlayer.inventory = removeFromInventory(newPlayer.inventory, action.itemId, 1);
      return { ...state, player: newPlayer };
    }

    default:
      return state;
  }
}
