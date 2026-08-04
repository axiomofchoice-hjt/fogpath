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
        name: { zh: "攻击 vs 防御", en: "Attack vs Guard" },
        description: {
          zh: "防御举盾减伤 50%，效果持续到下一次攻击前。",
          en: "Guard raises the shield: 50% damage reduction until your next attack.",
        },
      },
      {
        id: "test_atk_vs_rest",
        name: { zh: "攻击 vs 休息", en: "Attack vs Rest" },
        description: {
          zh: "休息方无防御，攻击全额命中。",
          en: "Rest provides no defense; attacks deal full damage.",
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
        id: "test_silence",
        name: { zh: "沉默", en: "Silence" },
        description: {
          zh: "目标下回合无法使用魔法攻击与魔法反弹。",
          en: "Target cannot use magic attacks or magic reflect next turn.",
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
          zh: "无视防御直接造成伤害，亦无视反甲。",
          en: "Ignores defense and thorns entirely.",
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
          zh: "整体判定：玩家攻击的动量须大于所有怪的攻击动量。",
          en: "Group check: player attack Momentum must exceed all enemies' attack Momentum.",
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
          zh: "Boss 强化模板（如所有攻击带沉默）。",
          en: "Boss buff templates (e.g., all attacks carry silence).",
        },
      },
    ],
  },
];
