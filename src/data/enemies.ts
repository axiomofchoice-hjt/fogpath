import type { EnemyDef } from "../types";

export const enemyDefs: Record<string, EnemyDef> = {
  goblin: {
    id: "goblin",
    name: { zh: "哥布林", en: "Goblin" },
    icon: "\uD83D\uDC3A",
    maxHp: 30,
    maxMp: 10,
    atk: 8,
    def: 4,
    ai: "attack",
  },
};
