import type { EnemyDef } from "../types";

export const enemyDefs: Record<string, EnemyDef> = {
  goblin: {
    id: "goblin",
    name: { zh: "哥布林", en: "Goblin" },
    icon: "\uD83D\uDC7A",
    maxHp: 30,
    maxMp: 10,
    damage: 8,
    momentum: 4,
    ai: "attack",
  },
  goblin_brute: {
    id: "goblin_brute",
    name: { zh: "哥布林壮汉", en: "Goblin Brute" },
    icon: "\uD83D\uDC7A\u200D\uD83D\uDCAA",
    maxHp: 45,
    maxMp: 10,
    damage: 12,
    momentum: 7,
    ai: "attack",
  },
};
