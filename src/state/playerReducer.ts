import type { GameAction, GameState } from "../types";
import { items as itemDefs, rooms as roomMap } from "../data/config";
import {
  addToInventory,
  assertInvariant,
  goldAmount,
  removeFromInventory,
} from "./helpers";

/** 玩家/村庄域：房间移动、商店、拾取/丢弃、装备、非战斗用道具 */
export function playerReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "MOVE_ROOM": {
      assertInvariant(!state.battle, "MOVE_ROOM 不能在战斗中使用");
      const room = roomMap[state.player.currentRoomId];
      assertInvariant(!!room, "MOVE_ROOM 当前房间定义不存在");
      assertInvariant(room.exits.includes(action.roomId), "MOVE_ROOM 目标非出口");
      assertInvariant(!!roomMap[action.roomId], "MOVE_ROOM 目标房间定义不存在");
      return {
        ...state,
        player: { ...state.player, currentRoomId: action.roomId },
      };
    }

    case "BUY_ITEM": {
      assertInvariant(!state.battle, "BUY_ITEM 不能在战斗中使用");
      const room = roomMap[state.player.currentRoomId];
      const entry = room?.shopItems?.find((s) => s.itemId === action.itemId);
      assertInvariant(!!entry, "BUY_ITEM 商店无此货物");
      const item = itemDefs[action.itemId];
      assertInvariant(!!item, "BUY_ITEM 物品定义不存在");
      const gold = goldAmount(state.player);
      if (gold < entry.price) return state; // 资源守卫：金币不足属合法拒绝
      return {
        ...state,
        player: {
          ...state.player,
          inventory: addToInventory(
            removeFromInventory(state.player.inventory, "gold", entry.price),
            action.itemId,
            1
          ),
        },
      };
    }

    case "PICKUP_ITEM": {
      assertInvariant(!state.battle, "PICKUP_ITEM 不能在战斗中使用");
      const item = itemDefs[action.itemId];
      assertInvariant(!!item, "PICKUP_ITEM 物品定义不存在");
      if (state.player.pickedItemIds.includes(action.itemId)) return state; // 幂等守卫：已拾取
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
      assertInvariant(!state.battle, "DISCARD_ITEM 不能在战斗中使用");
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
      assertInvariant(!state.battle, "EQUIP 不能在战斗中使用");
      const item = itemDefs[action.itemId];
      assertInvariant(!!item && item.type === "equipment", "EQUIP 只能装备装备类型物品");
      if (state.player.equipment.includes(action.itemId)) return state; // 幂等守卫：已装备
      const slotIndex = state.player.equipment.indexOf(null);
      if (slotIndex === -1) return state; // 资源守卫：装备栏已满
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
      assertInvariant(!state.battle, "UNEQUIP 不能在战斗中使用");
      const itemId = state.player.equipment[action.slotIndex];
      if (!itemId) return state; // 幂等守卫：空槽
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
      // 战斗中的使用道具由 battleReducer 处理（消耗一回合）：此处必须静默路由，不能断言
      if (state.battle) return state;
      const item = itemDefs[action.itemId];
      assertInvariant(!!item && item.type === "consumable", "USE_ITEM 只能使用消耗品");
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
