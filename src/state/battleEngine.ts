import type {
  BattleEnemy,
  BattleState,
  EnemyBattleAction,
  EnemyDef,
  L,
  Player,
  PlayerBattleAction,
} from "../types";
import { enemyDefs } from "../data/enemies";
import { skills as skillDefs } from "../data/skills";
import { items as itemDefs } from "../data/items";
import { testBattleConfigs } from "../data/battleTestConfigs";

const REST_MP = 50;

/** 防御动作的法力消耗 */
export const GUARD_MP = 10;

function enemyName(e: BattleEnemy, lang: "zh" | "en"): string {
  const def = enemyDefs[e.defId];
  return def ? def.name[lang] : e.defId;
}

function msg(zh: string, en: string): L {
  return { zh, en };
}

/** 技能的实际伤害/动量：基础攻击取玩家当前的资源值 */
function skillStats(
  skillId: string,
  playerDamage: number,
  playerMomentum: number
): { damage: number; momentum: number } {
  const def = skillDefs[skillId];
  if (!def || def.isBasic) return { damage: playerDamage, momentum: playerMomentum };
  return { damage: def.damage ?? playerDamage, momentum: def.momentum ?? playerMomentum };
}

/** 敌人 AI：根据策略选择本回合动作 */
function enemyAi(def: EnemyDef): EnemyBattleAction {
  switch (def.ai) {
    case "attack":
    default:
      return { kind: "attack", skillId: "basic_attack" };
  }
}

/** 全体存活敌人攻击玩家：按减伤比例计算伤害并写入日志、更新摘要 */
function enemiesHitPlayer(
  next: BattleState,
  aliveIndices: number[],
  reduction: number
): void {
  for (const i of aliveIndices) {
    const e = next.enemies[i];
    const dmg =
      reduction > 0 ? Math.max(0, Math.floor(e.damage * (1 - reduction))) : e.damage;
    next.playerHp = Math.max(0, next.playerHp - dmg);
    next.log.push(
      msg(
        `${enemyName(e, "zh")}攻击了你，造成 ${dmg} 点伤害。`,
        `${enemyName(e, "en")} attacks you for ${dmg} damage.`
      )
    );
    e.summary = enemySummary(e);
  }
}

export function initBattle(
  scenarioId: string,
  player: Player
): BattleState {
  const config = testBattleConfigs[scenarioId];
  // 玩家本身无属性：攻击的伤害/动量全部来自装备武器
  const weaponId = player.equipment.find((id) => id && itemDefs[id]?.damage != null);
  const weaponDamage = weaponId ? (itemDefs[weaponId]?.damage ?? 0) : 0;
  const weaponMomentum = weaponId ? (itemDefs[weaponId]?.momentum ?? 0) : 0;
  const enemies: BattleEnemy[] = (config?.enemies ?? []).map((id) => {
    const def = enemyDefs[id] as EnemyDef;
    return {
      defId: id,
      hp: def.maxHp,
      maxHp: def.maxHp,
      mp: def.maxMp,
      maxMp: def.maxMp,
      damage: 0,
      maxDamage: def.damage,
      momentum: 0,
      maxMomentum: def.momentum,
      hasAttack: false,
      isBoss: !!def.isBoss,
      action: enemyAi(def),
      summary: msg("蓄势待发。", "Getting ready..."),
    };
  });
  return {
    scenarioId,
    turn: 0,
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    playerMp: player.mp,
    playerMaxMp: player.maxMp,
    playerDef: player.def,
    playerDamage: 0,
    playerMaxDamage: weaponDamage,
    playerMomentum: 0,
    playerMaxMomentum: weaponMomentum,
    playerHasAttack: false,
    guardReduction: player.equipment.some(
      (id) => id && (itemDefs[id]?.def ?? 0) > 0
    )
      ? 0.5
      : 0,
    shieldActive: false,
    playerSummary: msg("蓄势待发。", "Getting ready..."),
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
 * - 攻击 vs 攻击：动量较大的一方生效，造成「自己的伤害 − 对面的动量」；动量相等双方无效
 * - 攻击 vs 防御：普通攻击被防住（无伤）
 * - 攻击 vs 休息：攻击全额命中
 * - 多怪（2.4.7）：玩家攻击整体判定（动量须大于所有怪的攻击的动量）
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
    playerDamage: state.playerMaxDamage,
    playerMomentum: state.playerMaxMomentum,
    shieldActive: state.shieldActive,
    enemies: state.enemies.map((e) => ({
      ...e,
      damage: e.maxDamage,
      momentum: e.maxMomentum,
    })),
    log: [...state.log],
  };

  const aliveIndices = next.enemies
    .map((e, i) => (e.hp > 0 ? i : -1))
    .filter((i) => i >= 0);

  next.log.push(msg(`— 回合 ${next.turn} —`, `— Turn ${next.turn} —`));

  let clashWon = false;
  let maxEnemyMomentum = 0;
  let playerSkillMomentum = next.playerMomentum;

  if (action.kind === "attack") {
    // 出手即破盾：减伤效果到下一次攻击前为止
    next.shieldActive = false;
    const skill = skillStats(action.skillId, next.playerDamage, next.playerMomentum);
    const skillDef = skillDefs[action.skillId];
    next.playerSummary = msg(
      `你使用了${skillDef?.name.zh ?? "普通攻击"}。`,
      `You use ${skillDef?.name.en ?? "Basic Attack"}.`
    );
    next.playerMp = Math.max(0, next.playerMp - (skillDefs[action.skillId]?.mpCost ?? 0));
    playerSkillMomentum = skill.momentum;
    maxEnemyMomentum = Math.max(
      ...aliveIndices.map((i) => next.enemies[i].momentum)
    );
    clashWon = skill.momentum > 0 && skill.momentum > maxEnemyMomentum;
    if (clashWon) {
      const dmg = Math.max(0, skill.damage - maxEnemyMomentum);
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
        if (e.momentum > 0 && e.momentum > state.playerDef) {
          const dmg = Math.max(0, e.damage - state.playerDef);
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
    for (const i of aliveIndices) {
      next.enemies[i].summary = enemySummary(next.enemies[i]);
    }
  } else if (action.kind === "guard") {
    next.shieldActive = true;
    next.playerMp = Math.max(0, next.playerMp - GUARD_MP);
    const reduction = next.guardReduction;
    next.playerSummary = msg(
      reduction > 0
        ? "你举起了盾，减伤 50% 直到下一次攻击前。"
        : "你选择了防御，但没有装备盾牌。",
      reduction > 0
        ? "You raise your shield, reducing damage by 50% until your next attack."
        : "You guard, but have no shield."
    );
    next.log.push(
      msg(
        reduction > 0
          ? "你举起了盾，减伤 50% 直到下一次攻击前。"
          : "你举起了盾，但没有装备盾牌。",
        reduction > 0
          ? "You raise your shield, reducing damage by 50% until your next attack."
          : "You raise your shield, but have no shield."
      )
    );
    enemiesHitPlayer(next, aliveIndices, reduction);
  } else {
    next.playerSummary = msg(
      `你选择了休息，恢复了 ${REST_MP} 点 MP。`,
      `You rest, recovering ${REST_MP} MP.`
    );
    next.playerMp = Math.min(state.playerMaxMp, state.playerMp + REST_MP);
    next.log.push(
      msg(
        `你休息了片刻，恢复了 ${REST_MP} 点 MP。`,
        `You rest for a moment, restoring ${REST_MP} MP.`
      )
    );
    enemiesHitPlayer(
      next,
      aliveIndices,
      next.shieldActive && next.guardReduction > 0 ? next.guardReduction : 0
    );
  }

  // 对撞后的属性显示：动作属性每回合重置，不累计。
  // 双方动量各自减少自己的动量变化量：单怪 = min(自己, 对方)；
  //   多怪时玩家面对全体，变化量 = min(自己动量, 所有存活怪动量之和)；
  // 伤害减去自己动量的变化量；败方动量归零（伤害变灰）
  // 防御（减伤）/休息动作本身无伤害/动量属性，攻击方不受动量惩罚
  if (action.kind === "attack") {
    const totalEnemyMomentum = aliveIndices.reduce(
      (sum, i) => sum + next.enemies[i].momentum,
      0
    );
    const playerMomChange = Math.min(next.playerMomentum, totalEnemyMomentum);
    next.playerMomentum = next.playerMomentum - playerMomChange;
    next.playerDamage = Math.max(0, next.playerDamage - playerMomChange);
    for (const i of aliveIndices) {
      const e = next.enemies[i];
      const momChange = Math.min(e.momentum, playerSkillMomentum);
      e.momentum = e.momentum - momChange;
      e.damage = Math.max(0, e.damage - momChange);
    }
  } else {
    next.playerDamage = 0;
    next.playerMomentum = 0;
  }

  // 攻击属性标记：玩家攻击 → 有效；防御/休息 → 无效（显示 0/0）
  next.playerHasAttack = action.kind === "attack";
  for (const i of aliveIndices) {
    next.enemies[i].hasAttack = true;
  }

  const remaining = next.enemies.filter((e) => e.hp > 0).length;
  if (remaining === 0) {
    next.result = "victory";
    next.log.push(msg("战斗胜利！", "Victory!"));
  } else if (next.playerHp <= 0) {
    next.result = "defeat";
    next.log.push(msg("你被击败了…", "You have been defeated..."));
  } else {
    next.enemies = next.enemies.map((e) =>
      e.hp > 0 ? { ...e, action: enemyAi(enemyDefs[e.defId]) } : e
    );
  }

  return next;
}

/**
 * 生成敌人本回合动作摘要（在敌人卡右侧显示），简洁版：XXX使用了普通攻击。
 */
function enemySummary(e: BattleEnemy): L {
  const def = enemyDefs[e.defId];
  const nameZh = def.name.zh;
  const nameEn = def.name.en;

  if (e.action.kind === "guard") {
    return msg(`${nameZh}选择了防御。`, `${nameEn} guards.`);
  }
  if (e.action.kind === "rest") {
    return msg(
      `${nameZh}选择了休息，恢复了 ${REST_MP} 点 MP。`,
      `${nameEn} rests, recovering ${REST_MP} MP.`
    );
  }

  const skill = skillDefs[e.action.skillId];
  return msg(
    `${nameZh}使用了${skill.name.zh}。`,
    `${nameEn} uses ${skill.name.en}.`
  );
}
