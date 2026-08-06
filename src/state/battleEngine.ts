import type {
  AttackPattern,
  BattleEnemy,
  BattleState,
  L,
  Player,
  PlayerBattleAction,
} from "../types";
import { enemyDefs, items as itemDefs, skills as skillDefs } from "../data/config";
import { testBattleConfigs } from "../data/battleTestConfigs";

/** 休息动作的 MP 回复量 */
export const REST_MP = 10;

/** 防御动作的法力消耗 */
export const GUARD_MP = 10;

/** 举盾减伤比例（盾牌防御动作） */
export const SHIELD_REDUCTION = 0.5;

/** 模式防重复：刚完成模式在下次选取时权重降低的比例（GDD 2.4.9） */
export const PATTERN_REPEAT_PENALTY = 0.25;

function enemyName(e: BattleEnemy, lang: "zh" | "en"): string {
  const def = enemyDefs[e.defId];
  return def ? def.name[lang] : e.defId;
}

function msg(zh: string, en: string): L {
  return { zh, en };
}

/** 技能的实际伤害/动量：由装备提供的动作决定（技能定义本身不携带数值） */
function actionStats(
  playerActions: BattleState["playerActions"],
  skillId: string
): { damage: number; momentum: number } {
  return (
    playerActions.find((a) => a.skillId === skillId) ?? { damage: 0, momentum: 0 }
  );
}

/**
 * 模式池加权随机选取（GDD 2.4.9）：
 * 刚完成的模式权重 × PATTERN_REPEAT_PENALTY 降档，提高不重复概率。
 */
export function pickPattern(
  patterns: AttackPattern[],
  lastPatternId: string | null,
  rng: () => number = Math.random
): AttackPattern {
  const pool = patterns.map((p) => ({
    pattern: p,
    weight: p.id === lastPatternId ? p.weight * PATTERN_REPEAT_PENALTY : p.weight,
  }));
  const total = pool.reduce((sum, x) => sum + x.weight, 0);
  let roll = rng() * total;
  for (const { pattern, weight } of pool) {
    roll -= weight;
    if (roll < 0) return pattern;
  }
  return patterns[patterns.length - 1];
}

/** 按敌人当前模式步设置本回合属性与摘要（蓄力回合无攻击属性，等同休息方） */
function applyEnemyStep(e: BattleEnemy): BattleEnemy {
  const def = enemyDefs[e.defId];
  const pattern = def.patterns.find((p) => p.id === e.pattern.patternId);
  const step = pattern?.steps[e.pattern.stepIndex];
  if (!step || step.kind === "charge") {
    return {
      ...e,
      damage: 0,
      maxDamage: 0,
      momentum: 0,
      maxMomentum: 0,
      hasAttack: false,
      summary: msg(`${def.name.zh}正在蓄力…`, `${def.name.en} is charging...`),
    };
  }
  return {
    ...e,
    damage: step.damage,
    maxDamage: step.damage,
    momentum: step.momentum,
    maxMomentum: step.momentum,
    hasAttack: true,
    summary: msg(
      `${def.name.zh}使用了${step.name.zh}！`,
      `${def.name.en} uses ${step.name.en}!`
    ),
  };
}

/** 模式推进：执行完当前步后进入下一步；模式完成则选取下一个模式（防重复权重惩罚） */
function advanceEnemyPattern(e: BattleEnemy): BattleEnemy {
  const def = enemyDefs[e.defId];
  const pattern = def.patterns.find((p) => p.id === e.pattern.patternId);
  if (!pattern) return e;
  const nextStep = e.pattern.stepIndex + 1;
  if (nextStep < pattern.steps.length) {
    return { ...e, pattern: { patternId: pattern.id, stepIndex: nextStep } };
  }
  const picked = pickPattern(def.patterns, pattern.id);
  return {
    ...e,
    pattern: { patternId: picked.id, stepIndex: 0 },
    lastPatternId: pattern.id,
  };
}

/** 全体有攻击属性的存活敌人攻击玩家：按减伤比例计算伤害并写入日志 */
function enemiesHitPlayer(
  next: BattleState,
  aliveIndices: number[],
  reduction: number
): void {
  for (const i of aliveIndices) {
    const e = next.enemies[i];
    if (!e.hasAttack) continue;
    const dmg =
      reduction > 0 ? Math.max(0, Math.floor(e.damage * (1 - reduction))) : e.damage;
    next.playerStats.hp = Math.max(0, next.playerStats.hp - dmg);
    next.log.push(
      msg(
        `${enemyName(e, "zh")}攻击了你，造成 ${dmg} 点伤害。`,
        `${enemyName(e, "en")} attacks you for ${dmg} damage.`
      )
    );
  }
}

export function initBattle(
  scenarioId: string,
  player: Player
): BattleState {
  const config = testBattleConfigs[scenarioId];
  // 玩家本身无属性：攻击动作全部来自装备（测试场景可直接覆盖装备）
  const equipment = config?.equipment ?? player.equipment;
  const playerActions = equipment.flatMap((id) => {
    const def = id ? itemDefs[id] : undefined;
    return def?.actions ?? [];
  });
  const enemies: BattleEnemy[] = (config?.enemies ?? []).flatMap((id) => {
    const def = enemyDefs[id];
    if (!def) return [];
    const first = pickPattern(def.patterns, null);
    return [{
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
      pattern: { patternId: first.id, stepIndex: 0 },
      lastPatternId: null,
      // 战斗开始：蓄势待发（模式步从第一回合开始生效）
      summary: msg("蓄势待发。", "Getting ready..."),
    }];
  });
  return {
    scenarioId,
    turn: 0,
    playerStats: {
      hp: player.hp,
      maxHp: player.maxHp,
      mp: player.mp,
      maxMp: player.maxMp,
      damage: 0,
      maxDamage: 0,
      momentum: 0,
      maxMomentum: 0,
      hasAttack: false,
    },
    playerSummary: msg("蓄势待发。", "Getting ready..."),
    playerActions,
    equipment,
    guardReduction: equipment.some((id) => id && itemDefs[id]?.isShield)
      ? SHIELD_REDUCTION
      : 0,
    shieldActive: false,
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
 * - 攻击 vs 攻击：动量较大的一方生效，造成自己全额伤害；被压制方（含动量相等）全数格挡
 * - 攻击 vs 防御：普通攻击被防住（无伤）
 * - 攻击 vs 休息：攻击全额命中
 * - 多怪（2.4.7）：玩家攻击整体判定（动量须大于所有怪的攻击的动量）
 */
export function resolveTurn(
  state: BattleState,
  action: PlayerBattleAction
): BattleState {
  if (state.result !== "ongoing") return state;
  // 动作必须由装备提供：未装备的技能不可使用（返回原状态，不消耗回合与 MP）
  if (action.kind === "attack" && !state.playerActions.some((a) => a.skillId === action.skillId)) {
    return state;
  }
  // 引擎兜底校验 MP：不足时动作无效（不消耗回合；UI 按钮已禁用，此处防绕过）
  const mpCost = action.kind === "attack"
    ? (skillDefs[action.skillId]?.mpCost ?? 0)
    : action.kind === "guard"
      ? GUARD_MP
      : 0;
  if (mpCost > 0 && state.playerStats.mp < mpCost) return state;
  // 使用道具：必须为消耗品且有效果
  if (action.kind === "useItem") {
    const item = itemDefs[action.itemId];
    if (!item || item.type !== "consumable" || !(item.hpRestore || item.mpRestore)) {
      return state;
    }
  }

  // 本回合攻击动作的属性：由装备提供的动作决定；防御/休息无攻击属性
  const stats = action.kind === "attack" ? actionStats(state.playerActions, action.skillId) : { damage: 0, momentum: 0 };

  const next: BattleState = {
    ...state,
    turn: state.turn + 1,
    playerStats: {
      ...state.playerStats,
      damage: stats.damage,
      maxDamage: stats.damage,
      momentum: stats.momentum,
      maxMomentum: stats.momentum,
    },
    shieldActive: state.shieldActive,
    enemies: state.enemies.map(applyEnemyStep),
    log: [...state.log],
  };

  const aliveIndices = next.enemies
    .map((e, i) => (e.hp > 0 ? i : -1))
    .filter((i) => i >= 0);

  next.log.push(msg(`— 回合 ${next.turn} —`, `— Turn ${next.turn} —`));

  let clashWon = false;
  let maxEnemyMomentum = 0;
  let playerSkillMomentum = next.playerStats.momentum;

  if (action.kind === "attack") {
    // 出手即破盾：减伤效果到下一次攻击前为止
    next.shieldActive = false;
    const skillDef = skillDefs[action.skillId];
    next.playerSummary = msg(
      `你使用了${skillDef?.name.zh ?? "普通攻击"}。`,
      `You use ${skillDef?.name.en ?? "Basic Attack"}.`
    );
    next.playerStats.mp = Math.max(0, next.playerStats.mp - (skillDefs[action.skillId]?.mpCost ?? 0));
    playerSkillMomentum = stats.momentum;
    maxEnemyMomentum = Math.max(
      ...aliveIndices.map((i) => next.enemies[i].momentum)
    );
    clashWon = stats.momentum > 0 && stats.momentum > maxEnemyMomentum;
    if (clashWon) {
      // 全额生效：动量大者造成自己全额伤害
      const dmg = stats.damage;
      const target = next.enemies[action.targetIndex];
      if (target && target.hp > 0) {
        target.hp = Math.max(0, target.hp - dmg);
        next.log.push(
          msg(
            `你命中了${enemyName(target, "zh")}，造成 ${dmg} 点伤害。`,
            `You hit ${enemyName(target, "en")}, dealing ${dmg} damage.`
          )
        );
      } else {
        next.log.push(msg("你的攻击落空了。", "Your attack misses."));
      }
    } else {
      next.log.push(
        msg(
          "你的攻击被格挡，未造成伤害。",
          "Your attack is deflected, dealing no damage."
        )
      );
      // 缠斗胜出的敌人对玩家造成全额伤害（无防御减免）
      for (const i of aliveIndices) {
        const e = next.enemies[i];
        if (e.momentum > 0) {
          const dmg = e.damage;
          next.playerStats.hp = Math.max(0, next.playerStats.hp - dmg);
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
    next.shieldActive = true;
    next.playerStats.mp = Math.max(0, next.playerStats.mp - GUARD_MP);
    const reduction = next.guardReduction;
    const pct = Math.round(SHIELD_REDUCTION * 100);
    const guardMsg = msg(
      reduction > 0
        ? `你举起了盾，减伤 ${pct}% 直到下一次攻击前。`
        : "你选择了防御，但没有装备盾牌。",
      reduction > 0
        ? `You raise your shield, reducing damage by ${pct}% until your next attack.`
        : "You guard, but have no shield."
    );
    next.playerSummary = guardMsg;
    next.log.push(guardMsg);
    enemiesHitPlayer(next, aliveIndices, reduction);
  } else if (action.kind === "useItem") {
    // 使用道具：消耗一个回合（无防御、不破盾），效果作用于战斗内属性
    const item = itemDefs[action.itemId];
    next.playerStats.hp = Math.min(
      next.playerStats.maxHp,
      next.playerStats.hp + (item?.hpRestore ?? 0)
    );
    next.playerStats.mp = Math.min(
      next.playerStats.maxMp,
      next.playerStats.mp + (item?.mpRestore ?? 0)
    );
    next.playerSummary = msg(
      `你使用了${item?.name.zh ?? "道具"}。`,
      `You use ${item?.name.en ?? "item"}.`
    );
    next.log.push(next.playerSummary);
    enemiesHitPlayer(
      next,
      aliveIndices,
      next.shieldActive && next.guardReduction > 0 ? next.guardReduction : 0
    );
  } else {
    next.playerSummary = msg(
      `你选择了休息，恢复了 ${REST_MP} 点 MP。`,
      `You rest, recovering ${REST_MP} MP.`
    );
    next.playerStats.mp = Math.min(state.playerStats.maxMp, state.playerStats.mp + REST_MP);
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
  // 全额生效：赢家伤害显示满值；被压制方全数格挡，伤害显示 0（变灰）
  // 防御（减伤）/休息/使用道具动作本身无伤害/动量属性，显示 0/0
  if (action.kind === "attack") {
    const totalEnemyMomentum = aliveIndices.reduce(
      (sum, i) => sum + next.enemies[i].momentum,
      0
    );
    const playerMomChange = Math.min(next.playerStats.momentum, totalEnemyMomentum);
    next.playerStats.momentum = next.playerStats.momentum - playerMomChange;
    next.playerStats.damage = clashWon ? next.playerStats.maxDamage : 0;
    // 敌方获胜 = 玩家对撞失败且非平局（平局双方均格挡）
    const enemyWon = !clashWon && stats.momentum < maxEnemyMomentum;
    for (const i of aliveIndices) {
      const e = next.enemies[i];
      const momChange = Math.min(e.momentum, playerSkillMomentum);
      e.momentum = e.momentum - momChange;
      // 赢家伤害显示满值：敌方赢 → 满值；玩家赢或平局 → 全数格挡（0）
      e.damage = enemyWon ? e.maxDamage : 0;
    }
  } else {
    next.playerStats.damage = 0;
    next.playerStats.momentum = 0;
  }

  // 攻击属性标记：玩家攻击 → 有效；防御/休息/使用道具 → 无效（显示 0/0）
  next.playerStats.hasAttack = action.kind === "attack";
  // 敌人 hasAttack 已在回合开始时按模式步设置（蓄力回合为 false）

  const remaining = next.enemies.filter((e) => e.hp > 0).length;
  if (remaining === 0) {
    next.result = "victory";
    next.log.push(msg("战斗胜利！", "Victory!"));
  } else if (next.playerStats.hp <= 0) {
    next.result = "defeat";
    next.log.push(msg("你被击败了…", "You have been defeated..."));
  } else {
    // 模式推进：存活敌人执行下一步（模式完成则选取下一个模式）
    next.enemies = next.enemies.map((e) =>
      e.hp > 0 ? advanceEnemyPattern(e) : e
    );
  }

  return next;
}
