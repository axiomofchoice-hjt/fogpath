import type { SkillDef } from "../types";

export const skills: Record<string, SkillDef> = {
  basic_attack: {
    id: "basic_attack",
    name: { zh: "普通攻击", en: "Basic Attack" },
    icon: "\u2694\uFE0F",
    type: "physical",
    mpCost: 10,
  },
  fireball: {
    id: "fireball",
    name: { zh: "火球术", en: "Fireball" },
    icon: "\uD83D\uDD25",
    type: "magic",
    mpCost: 12,
  },
  lightning: {
    id: "lightning",
    name: { zh: "闪电术", en: "Lightning" },
    icon: "\u26A1",
    type: "magic",
    mpCost: 10,
  },
  rock_bolt: {
    id: "rock_bolt",
    name: { zh: "岩石飞弹", en: "Rock Bolt" },
    icon: "\uD83E\uDEA8",
    type: "magic",
    mpCost: 8,
  },
};
