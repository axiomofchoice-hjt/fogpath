import type { GameAction, GameState } from "../types";
import { dungeons as dungeonDefs, items as itemDefs, rooms as roomMap } from "../data/config";
import { initBattleFromEnemies } from "./battleEngine";
import { generateDungeon } from "./dungeonGen";
import { addToInventory, assertInvariant, patchRoom, stripPackSpirit } from "./helpers";

/** 该地牢的村庄入口房间（RoomDef.dungeonId 指向地牢） */
function entranceRoomId(dungeonId: string): string {
  const entry = Object.values(roomMap).find((r) => r.dungeonId === dungeonId);
  assertInvariant(!!entry, `地牢 "${dungeonId}" 没有配置村庄入口房间`);
  return entry.id;
}

/** 地牢域：进入、移动、进房开战、拾取、撤离 */
export function dungeonReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ENTER_DUNGEON": {
      assertInvariant(!state.battle && !state.dungeon, "ENTER_DUNGEON 已在战斗或地牢中");
      const def = dungeonDefs[action.dungeonId];
      assertInvariant(!!def, "ENTER_DUNGEON 地牢配置不存在");
      assertInvariant(
        roomMap[state.player.currentRoomId]?.dungeonId === action.dungeonId,
        "ENTER_DUNGEON 需在地牢入口房间"
      );
      const dungeon = generateDungeon(def);
      // 入口物品自动入包（教学关背包精灵：无需点击即跟随，置 hasPet）
      const { x, y } = dungeon.playerPos;
      const entrance = dungeon.rooms[y][x]!;
      let inventory = [...state.player.inventory];
      let hasPet = state.player.hasPet;
      for (const id of entrance.itemIds) {
        inventory = addToInventory(inventory, id, 1);
        if (itemDefs[id]?.type === "pet") hasPet = true;
      }
      const rooms =
        entrance.itemIds.length > 0
          ? patchRoom(dungeon, x, y, { itemIds: [] })
          : dungeon.rooms;
      return {
        ...state,
        player: { ...state.player, hasPet, inventory },
        dungeon: { ...dungeon, rooms },
      };
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
      const item = itemDefs[action.itemId];
      return {
        ...state,
        player: {
          ...state.player,
          // 拾取宠物：置 hasPet（死亡时背包运回村庄，GDD 2.6.4）
          hasPet: state.player.hasPet || item?.type === "pet",
          inventory: addToInventory(state.player.inventory, action.itemId, 1),
        },
        dungeon: { ...dungeon, rooms },
      };
    }

    case "DUNGEON_RETREAT": {
      assertInvariant(!state.battle && !!state.dungeon, "DUNGEON_RETREAT 需在地牢且非战斗中");
      // 撤离：地牢废弃，回入口房间，HP/MP 回满；背包精灵消散
      return {
        ...state,
        player: stripPackSpirit({
          ...state.player,
          hp: state.player.maxHp,
          mp: state.player.maxMp,
          currentRoomId: entranceRoomId(state.dungeon.dungeonId),
        }),
        dungeon: null,
      };
    }

    default:
      return state;
  }
}
