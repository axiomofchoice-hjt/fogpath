import type { GameAction, GameState } from "../types";
import { items as itemDefs } from "../data/config";
import { testBattleConfigs } from "../data/battleTestConfigs";
import { initBattle, resolveTurn } from "./battleEngine";
import {
  addToInventory,
  assertInvariant,
  canRemoveFromInventory,
  patchRoom,
  removeFromInventory,
  rollLoot,
} from "./helpers";

/** 战斗域：测试战斗入口、出招、使用道具（战斗中）、战斗结算（地牢/测试） */
export function battleReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_TEST_BATTLE": {
      assertInvariant(!state.battle, "START_TEST_BATTLE 不能重复开启战斗");
      const config = testBattleConfigs[action.scenarioId];
      assertInvariant(!!config, "START_TEST_BATTLE 场景不存在");
      return { ...state, battle: initBattle(action.scenarioId, state.player) };
    }

    case "BATTLE_ACT": {
      assertInvariant(!!state.battle, "BATTLE_ACT 无战斗进行");
      return { ...state, battle: resolveTurn(state.battle, action.action) };
    }

    case "USE_ITEM": {
      // 非战斗时的使用道具由 playerReducer 处理：此处必须静默路由，不能断言
      if (!state.battle) return state;
      // 战斗中使用道具：作为战斗动作生效于战斗内属性（引擎校验并结算敌方回合）
      if (!canRemoveFromInventory(state.player.inventory, action.itemId, 1)) {
        return state; // 资源守卫：背包数量不足
      }
      const item = itemDefs[action.itemId];
      if (!item || item.type !== "consumable" || !(item.hpRestore || item.mpRestore)) {
        return state; // 数据守卫：非消耗品或无回复效果
      }
      const battle = resolveTurn(state.battle, { kind: "useItem", itemId: action.itemId });
      if (battle === state.battle) return state;
      return {
        ...state,
        battle,
        player: {
          ...state.player,
          inventory: removeFromInventory(state.player.inventory, action.itemId, 1),
        },
      };
    }

    case "EXIT_BATTLE": {
      assertInvariant(!!state.battle, "EXIT_BATTLE 无战斗进行");
      // 战斗未结束不可结算（UI 只在结束时显示按钮，此处防绕过）
      assertInvariant(state.battle.result !== "ongoing", "EXIT_BATTLE 战斗未结束不可结算");
      // 地牢战斗结算（按场景判定：测试战斗为调试通道，不触发地牢结算）
      if (state.battle.scenarioId === "dungeon" && state.dungeon) {
        const { player, battle, dungeon } = state;
        const room = dungeon.rooms[dungeon.playerPos.y][dungeon.playerPos.x]!;
        if (battle.result === "victory") {
          // 胜利：敌人清除 + 掉落入账（含金币），HP/MP 损耗保留在地牢中
          const drop = rollLoot(room.enemyIds);
          const rooms = patchRoom(dungeon, dungeon.playerPos.x, dungeon.playerPos.y, {
            enemyIds: [],
          });
          let inventory = [...player.inventory];
          inventory = addToInventory(inventory, "gold", drop.gold);
          for (const itemId of drop.items) {
            inventory = addToInventory(inventory, itemId, 1);
          }
          return {
            ...state,
            player: {
              ...player,
              hp: battle.playerStats.hp,
              mp: battle.playerStats.mp,
              inventory,
            },
            battle: null,
            dungeon: { ...dungeon, rooms },
          };
        }
        // 败北：死亡结算——装备全丢、背包保留、地牢废弃回村庄（HP/MP 回满）
        return {
          ...state,
          player: {
            ...player,
            hp: player.maxHp,
            mp: player.maxMp,
            equipment: player.equipment.map(() => null),
          },
          battle: null,
          dungeon: null,
        };
      }
      // 测试战斗：非战斗状态 HP/MP 自动回满
      return {
        ...state,
        player: {
          ...state.player,
          hp: state.player.maxHp,
          mp: state.player.maxMp,
        },
        battle: null,
      };
    }

    default:
      return state;
  }
}
