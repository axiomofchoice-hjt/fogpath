import type { GameAction, GameState } from "../types";
import { dungeons as dungeonDefs } from "../data/config";
import { initBattleFromEnemies } from "./battleEngine";
import { generateDungeon } from "./dungeonGen";
import { addToInventory, patchRoom } from "./helpers";

/** 地牢域：进入、移动、进房开战、拾取、撤离 */
export function dungeonReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ENTER_DUNGEON": {
      if (state.battle || state.dungeon) return state;
      if (state.player.currentRoomId !== "forest_entrance") return state;
      const def = dungeonDefs[action.dungeonId];
      if (!def) return state;
      return { ...state, dungeon: generateDungeon(def) };
    }

    case "DUNGEON_MOVE": {
      if (state.battle || !state.dungeon) return state;
      const { dungeon } = state;
      const { x, y } = dungeon.playerPos;
      const nx = x + action.dx;
      const ny = y + action.dy;
      if (nx < 0 || ny < 0 || nx >= dungeon.size.w || ny >= dungeon.size.h) return state;
      const target = dungeon.rooms[ny][nx];
      if (!target) return state; // 墙（无房间）不可通行
      // 未探索且有敌人：不移动（由情报面板确认后 DUNGEON_ENTER_TILE）
      if (!target.explored && target.enemyIds.length > 0) return state;
      const rooms = patchRoom(dungeon, nx, ny, { explored: true });
      return {
        ...state,
        dungeon: { ...dungeon, rooms, playerPos: { x: nx, y: ny } },
      };
    }

    case "DUNGEON_ENTER_TILE": {
      if (state.battle || !state.dungeon) return state;
      const { dungeon } = state;
      const { x, y } = dungeon.playerPos;
      if (Math.abs(action.x - x) + Math.abs(action.y - y) !== 1) return state;
      if (action.x < 0 || action.y < 0 || action.x >= dungeon.size.w || action.y >= dungeon.size.h) {
        return state;
      }
      const target = dungeon.rooms[action.y][action.x];
      if (!target) return state; // 墙（无房间）不可进入
      if (target.explored || target.enemyIds.length === 0) return state;
      const rooms = patchRoom(dungeon, action.x, action.y, { explored: true });
      return {
        ...state,
        dungeon: { ...dungeon, rooms, playerPos: { x: action.x, y: action.y } },
        battle: initBattleFromEnemies(target.enemyIds, state.player),
      };
    }

    case "DUNGEON_PICKUP": {
      if (state.battle || !state.dungeon) return state;
      const { dungeon } = state;
      const room = dungeon.rooms[dungeon.playerPos.y][dungeon.playerPos.x]!;
      if (!room.itemIds.includes(action.itemId)) return state;
      const rooms = patchRoom(dungeon, dungeon.playerPos.x, dungeon.playerPos.y, {
        itemIds: room.itemIds.filter((id) => id !== action.itemId),
      });
      return {
        ...state,
        player: {
          ...state.player,
          inventory: addToInventory(state.player.inventory, action.itemId, 1),
        },
        dungeon: { ...dungeon, rooms },
      };
    }

    case "DUNGEON_RETREAT": {
      if (state.battle || !state.dungeon) return state;
      // 撤离：地牢废弃，回村庄，HP/MP 回满
      return {
        ...state,
        player: {
          ...state.player,
          hp: state.player.maxHp,
          mp: state.player.maxMp,
          currentRoomId: "forest_entrance",
        },
        dungeon: null,
      };
    }

    default:
      return state;
  }
}
