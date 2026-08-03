import type {
  BattleEnemy,
  BattleState,
  EnemyDef,
  L,
  Player,
  PlayerBattleAction,
} from "../types";
import { enemyDefs } from "../data/enemies";
import { skills as skillDefs } from "../data/skills";
import { testBattleConfigs } from "../data/battleTestConfigs";

const REGEN_MP = 10;

function enemyName(e: BattleEnemy, lang: "zh" | "en"): string {
  const def = enemyDefs[e.defId];
  return def ? def.name[lang] : e.defId;
}

function msg(zh: string, en: string): L {
  return { zh, en };
}

/** 技能的实际攻/防：基础攻击取玩家当前数值 */
function skillStats(
  skillId: string,
  playerAtk: number,
  playerDef: number
): { atk: number; def: number } {
  const def = skillDefs[skillId];
  if (!def || def.isBasic) return { atk: playerAtk, def: playerDef };
  return { atk: def.atk ?? playerAtk, def: def.def ?? playerDef };
}

export function initBattle(
  scenarioId: string,
  player: Player
): BattleState {
  const config = testBattleConfigs[scenarioId];
  const enemies: BattleEnemy[] = (config?.enemies ?? []).map((id) => {
    const def = enemyDefs[id] as EnemyDef;
    return {
      defId: id,
      hp: def.maxHp,
      maxHp: def.maxHp,
      mp: def.maxMp,
      maxMp: def.maxMp,
      atk: def.atk,
      def: def.def,
      isBoss: !!def.isBoss,
    };
  });
  return {
    scenarioId,
    turn: 0,
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    playerMp: player.mp,
    playerMaxMp: player.maxMp,
    playerAtk: player.atk,
    playerDef: player.def,
    enemies,
    log: [
      msg(
        "战斗开始！",
        "Battle begins!"
      ),
    ],
    result: "ongoing",
  };
}

/**
 * 同时结算一回合（GDD 2.4）：
 * - 攻 vs 攻：防属性较大的一方生效，造成「自己的攻 − 对面的防」；防相等双方无效
 * - 攻 vs 防御：普通攻击被防住（无伤）
 * - 攻 vs 回蓝：攻击全额命中
 * - 多怪（2.4.6）：玩家攻击整体判定（防须大于所有怪的攻击的防）
 */
export function resolveTurn(
  state: BattleState,
  action: PlayerBattleAction
): BattleState {
  if (state.result !== "ongoing") return state;

  const next: BattleState = {
    ...state,
    turn: state.turn + 1,
    playerHp: state.playerHp,
    playerMp: state.playerMp,
    enemies: state.enemies.map((e) => ({ ...e })),
    log: [...state.log],
  };

  const aliveIndices = next.enemies
    .map((e, i) => (e.hp > 0 ? i : -1))
    .filter((i) => i >= 0);

  next.log.push(msg(`— 回合 ${next.turn} —`, `— Turn ${next.turn} —`));

  if (action.kind === "attack") {
    const skill = skillStats(action.skillId, state.playerAtk, state.playerDef);
    const maxEnemyDef = Math.max(...aliveIndices.map((i) => next.enemies[i].def));
    if (skill.def > maxEnemyDef) {
      const dmg = Math.max(1, skill.atk - maxEnemyDef);
      const target = next.enemies[action.targetIndex];
      if (target && target.hp > 0) {
        target.hp = Math.max(0, target.hp - dmg);
        next.log.push(
          msg(
            `你命中了${enemyName(target, "zh")}，造成 ${dmg} 点伤害。`,
            `You hit ${enemyName(target, "en")}, dealing ${dmg} damage.`
          )
        );
      }
    } else {
      next.log.push(
        msg(
          "你的攻击被格挡，未造成伤害。",
          "Your attack is deflected, dealing no damage."
        )
      );
      for (const i of aliveIndices) {
        const e = next.enemies[i];
        if (e.def > state.playerDef) {
          const dmg = Math.max(1, e.atk - state.playerDef);
          next.playerHp = Math.max(0, next.playerHp - dmg);
          next.log.push(
            msg(
              `${enemyName(e, "zh")}攻击了你，造成 ${dmg} 点伤害。`,
              `${enemyName(e, "en")} attacks you for ${dmg} damage.`
            )
          );
        }
      }
    }
  } else if (action.kind === "guard") {
    next.log.push(
      msg("你举盾防御，挡住了敌人的攻击。", "You raise your guard, blocking the attack.")
    );
  } else {
    next.playerMp = Math.min(state.playerMaxMp, state.playerMp + REGEN_MP);
    next.log.push(
      msg(
        `你集中精神，恢复了 ${REGEN_MP} 点 MP。`,
        `You focus, restoring ${REGEN_MP} MP.`
      )
    );
    for (const i of aliveIndices) {
      const e = next.enemies[i];
      next.playerHp = Math.max(0, next.playerHp - e.atk);
      next.log.push(
        msg(
          `${enemyName(e, "zh")}攻击了你，造成 ${e.atk} 点伤害。`,
          `${enemyName(e, "en")} attacks you for ${e.atk} damage.`
        )
      );
    }
  }

  const remaining = next.enemies.filter((e) => e.hp > 0).length;
  if (remaining === 0) {
    next.result = "victory";
    next.log.push(msg("战斗胜利！", "Victory!"));
  } else if (next.playerHp <= 0) {
    next.result = "defeat";
    next.log.push(msg("你被击败了…", "You have been defeated..."));
  }

  return next;
}
