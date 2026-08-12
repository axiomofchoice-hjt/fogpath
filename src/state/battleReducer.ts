import type { GameAction, GameState } from "../types";
import { items as itemDefs } from "../data/config";
import { testBattleConfigs } from "../data/battleTestConfigs";
import { DUNGEON_SCENARIO_ID, initBattle, resolveTurn } from "./battleEngine";
import { mulberry32 } from "./rng";
import {
  addToInventory,
  assertInvariant,
  canRemoveFromInventory,
  GOLD_ID,
  isUsableConsumable,
  patchRoom,
  removeFromInventory,
  rollLoot,
  stripPackSpirit,
} from "./helpers";

/** 战斗域：测试战斗入口、出招、使用道具（战斗中）、战斗结算（地牢/测试） */
export function battleReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_TEST_BATTLE": {
      assertInvariant(!state.battle, "START_TEST_BATTLE 不能重复开启战斗");
      const config = testBattleConfigs[action.scenarioId];
      assertInvariant(!!config, "START_TEST_BATTLE 场景不存在");
      return {
        ...state,
        battle: initBattle(action.scenarioId, state.player, mulberry32(action.seed)),
      };
    }

    case "BATTLE_ACT": {
      assertInvariant(!!state.battle, "BATTLE_ACT 无战斗进行");
      return {
        ...state,
        battle: resolveTurn(state.battle, action.action, mulberry32(action.seed)),
      };
    }

    case "USE_ITEM": {
      // 非战斗时的使用道具由 playerReducer 处理：此处必须静默路由，不能断言
      if (!state.battle) return state;
      // 数据守卫先行：非消耗品/无回复效果属调用方 bug（UI 已只对消耗品显示使用按钮），
      // 与玩家域一致 fail-fast——不得因背包中恰好无此物品而静默（与库存无关的 bug）
      assertInvariant(
        isUsableConsumable(itemDefs[action.itemId]),
        "USE_ITEM 只能使用有回复效果的消耗品"
      );
      // 资源守卫：背包数量不足为合法拒绝，静默
      if (!canRemoveFromInventory(state.player.inventory, action.itemId, 1)) {
        return state;
      }
      const battle = resolveTurn(
        state.battle,
        { kind: "useItem", itemId: action.itemId },
        mulberry32(action.seed)
      );
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
      if (state.battle.scenarioId === DUNGEON_SCENARIO_ID && state.dungeon) {
        const { player, battle, dungeon } = state;
        const room = dungeon.rooms[dungeon.playerPos.y][dungeon.playerPos.x]!;
        if (battle.result === "victory") {
          // 胜利：敌人清除 + 掉落入账（含金币）；HP 损耗保留在地牢中，MP 回满（非战斗状态 MP 自动回满）
          const drop = rollLoot(room.enemyIds, mulberry32(action.seed));
          const rooms = patchRoom(dungeon, dungeon.playerPos.x, dungeon.playerPos.y, {
            enemyIds: [],
          });
          let inventory = [...player.inventory];
          inventory = addToInventory(inventory, GOLD_ID, drop.gold);
          for (const itemId of drop.items) {
            inventory = addToInventory(inventory, itemId, 1);
          }
          return {
            ...state,
            player: {
              ...player,
              hp: battle.playerStats.hp,
              mp: player.maxMp,
              inventory,
            },
            battle: null,
            dungeon: { ...dungeon, rooms },
          };
        }
        // 败北：死亡结算——装备全丢、背包保留、地牢废弃回村庄（HP/MP 回满）；背包精灵消散
        return {
          ...state,
          player: stripPackSpirit({
            ...player,
            hp: player.maxHp,
            mp: player.maxMp,
            equipment: player.equipment.map(() => null),
          }),
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
