import type { TestScenarioGroup } from "../types";

export const testScenarioGroups: TestScenarioGroup[] = [
  {
    id: "collision",
    name: { zh: "对撞机制", en: "Collision" },
    scenarios: [
      {
        id: "test_atk_vs_atk",
        name: { zh: "攻击 vs 攻击（动量大者生效）", en: "Attack vs Attack (higher Momentum wins)" },
        description: {
          zh: "攻击对撞：动量较大的一方生效，动量相等双方无效。",
          en: "Attack vs attack: the side with higher Momentum takes effect; equal Momentum cancels both.",
        },
      },
      {
        id: "test_atk_vs_guard",
        name: { zh: "攻击 vs 防御（举盾减伤）", en: "Attack vs Guard (50% reduction)" },
        description: {
          zh: "装备盾牌时防御：敌方攻击减伤 50%，效果持续到下一次攻击前。",
          en: "Guard with a shield: enemy attacks deal 50% less damage until your next attack.",
        },
      },
      {
        id: "test_atk_vs_rest",
        name: { zh: "攻击 vs 休息（全额命中）", en: "Attack vs Rest (full damage)" },
        description: {
          zh: "休息方无防御，攻击全额命中，同时恢复 MP。",
          en: "Rest provides no defense; attacks deal full damage while you recover MP.",
        },
      },
      {
        id: "test_clash_loss",
        name: { zh: "动量压制（攻击被格挡）", en: "Momentum Suppression (deflected)" },
        description: {
          zh: "敌方动量高于玩家时攻击被格挡，敌方反击命中。",
          en: "When the enemy's Momentum exceeds yours, your attack is deflected and they counter.",
        },
      },
    ],
  },
  {
    id: "magic",
    name: { zh: "魔法动作", en: "Magic Actions" },
    scenarios: [
      {
        id: "test_magic_trio",
        name: { zh: "魔法三连（学徒木杖）", en: "Magic Trio (Apprentice's Staff)" },
        description: {
          zh: "测试内直接装备学徒木杖：战斗中出现火球术/闪电术/岩石飞弹三个魔法动作，按钮标注来源装备。",
          en: "The scenario equips the Apprentice's Staff directly: Fireball, Lightning and Rock Bolt appear, labeled with their source.",
        },
      },
    ],
  },
  {
    id: "multi",
    name: { zh: "多怪判定", en: "Multi-Enemy" },
    scenarios: [
      {
        id: "test_goblins_x3",
        name: { zh: "哥布林 ×3", en: "Goblins ×3" },
        description: {
          zh: "整体判定：玩家攻击的动量须大于所有怪的攻击动量；防御/休息时全体怪同时攻击。",
          en: "Group check: player attack Momentum must exceed all enemies' Momentum; all enemies strike when you guard or rest.",
        },
      },
    ],
  },
  {
    id: "reflect",
    name: { zh: "反弹机制", en: "Reflect" },
    scenarios: [
      {
        id: "test_shield_parry",
        name: { zh: "盾反", en: "Shield Parry" },
        description: {
          zh: "反弹较低属性的物理攻击。",
          en: "Reflects physical attacks with lower attributes.",
        },
      },
      {
        id: "test_magic_reflect",
        name: { zh: "魔法反弹", en: "Magic Reflect" },
        description: {
          zh: "全额反弹任何魔法攻击。",
          en: "Reflects any magic attack in full.",
        },
      },
    ],
  },
  {
    id: "effects",
    name: { zh: "特殊效果", en: "Special Effects" },
    scenarios: [
      {
        id: "test_blind",
        name: { zh: "致盲", en: "Blind" },
        description: {
          zh: "目标下一回合的攻击无法命中目标（不造成伤害），但动量的格挡对撞作用仍生效。",
          en: "Target's attacks cannot hit next turn (no damage), but momentum blocking still works.",
        },
      },
      {
        id: "test_lifesteal",
        name: { zh: "吸血", en: "Lifesteal" },
        description: {
          zh: "造成伤害时回复自身同等血量。",
          en: "Heals the attacker equal to damage dealt.",
        },
      },
      {
        id: "test_poison",
        name: { zh: "中毒", en: "Poison" },
        description: {
          zh: "目标持续扣血。",
          en: "Target takes damage over time.",
        },
      },
      {
        id: "test_pierce",
        name: { zh: "穿透", en: "Pierce" },
        description: {
          zh: "直接无效化对面的非穿透攻击；两个穿透攻击对撞时按伤害/动量正常结算。",
          en: "Directly nullifies the opponent's non-pierce attack; two pierce attacks clash by normal damage/momentum.",
        },
      },
    ],
  },
  {
    id: "boss",
    name: { zh: "Boss 强化", en: "Boss Buffs" },
    scenarios: [
      {
        id: "test_goblin_king",
        name: { zh: "哥布林王", en: "Goblin King" },
        description: {
          zh: "Boss 强化模板（如所有攻击带致盲）。",
          en: "Boss buff templates (e.g., all attacks carry blind).",
        },
      },
    ],
  },
];
