import type { SkillDef } from "../types";

export const skills: Record<string, SkillDef> = {
  basic_attack: {
    id: "basic_attack",
    name: { zh: "普通攻击", en: "Basic Attack" },
    icon: "\u2694\uFE0F",
    type: "physical",
    mpCost: 10,
    isBasic: true,
  },
};
