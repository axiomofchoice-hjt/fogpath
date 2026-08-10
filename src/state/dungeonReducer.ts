import type { GameAction, GameState } from "../types";
import { dungeons as dungeonDefs } from "../data/config";
import { initBattleFromEnemies } from "./battleEngine";
import { generateDungeon } from "./dungeonGen";
import { addToInventory, assertInvariant, patchRoom } from "./helpers";

/** 地牢域：进入、移动、进房开战、拾取、撤离 */
export function dungeonReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ENTER_DUNGEON": {
      assertInvariant(!state.battle && !state.dungeon, "ENTER_DUNGEON 已在战斗或地牢中");
      assertInvariant(
        state.player.currentRoomId === "forest_entrance",
        "ENTER_DUNGEON 需在森林入口房间"
      );
      const def = dungeonDefs[action.dungeonId];
      assertInvariant(!!def, "ENTER_DUNGEON 地牢配置不存在");
      return { ...state, dungeon: generateDungeon(def) };
    }

    case "DUNGEON_MOVE": {
      assertInvariant(!state.battle && !!state.dungeon, "DUNGEON_MOVE 需在地牢且非战斗中");
      const { dungeon } = state;
      const { x, y } = dungeon.playerPos;
      const nx = x + action.dx;
      const ny = y + action.dy;
      assertInvariant(
        nx >= 0 && ny >= 0 && nx < dungeon.size.w && ny < dungeon.size.h,
        "DUNGEON_MOVE 越界"
      );
      const target = dungeon.rooms[ny][nx];
      assertInvariant(!!target, "DUNGEON_MOVE 墙不可通行");
      // 未探索且有敌人：不移动（由情报面板确认后 DUNGEON_ENTER_TILE）
      assertInvariant(target.explored || target.enemyIds.length === 0, "DUNGEON_MOVE 未探索有敌人需情报确认");
      const rooms = patchRoom(dungeon, nx, ny, { explored: true });
      return {
        ...state,
        dungeon: { ...dungeon, rooms, playerPos: { x: nx, y: ny } },
      };
    }

    case "DUNGEON_ENTER_TILE": {
      assertInvariant(!state.battle && !!state.dungeon, "DUNGEON_ENTER_TILE 需在地牢且非战斗中");
      const { dungeon } = state;
      const { x, y } = dungeon.playerPos;
      assertInvariant(Math.abs(action.x - x) + Math.abs(action.y - y) === 1, "DUNGEON_ENTER_TILE 目标必须相邻");
      assertInvariant(
        action.x >= 0 && action.y >= 0 && action.x < dungeon.size.w && action.y < dungeon.size.h,
        "DUNGEON_ENTER_TILE 越界"
      );
      const target = dungeon.rooms[action.y][action.x];
      assertInvariant(!!target, "DUNGEON_ENTER_TILE 墙不可进入");
      assertInvariant(
        !target.explored && target.enemyIds.length > 0,
        "DUNGEON_ENTER_TILE 仅限未探索有敌人的房间"
      );
      const rooms = patchRoom(dungeon, action.x, action.y, { explored: true });
      return {
        ...state,
        dungeon: { ...dungeon, rooms, playerPos: { x: action.x, y: action.y } },
        battle: initBattleFromEnemies(target.enemyIds, state.player),
      };
    }

    case "DUNGEON_PICKUP": {
      assertInvariant(!state.battle && !!state.dungeon, "DUNGEON_PICKUP 需在地牢且非战斗中");
      const { dungeon } = state;
      const room = dungeon.rooms[dungeon.playerPos.y][dungeon.playerPos.x]!;
      assertInvariant(room.itemIds.includes(action.itemId), "DUNGEON_PICKUP 当前格无此物品");
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
      assertInvariant(!state.battle && !!state.dungeon, "DUNGEON_RETREAT 需在地牢且非战斗中");
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
