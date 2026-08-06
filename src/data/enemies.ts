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
    patterns: [
      {
        id: "combo",
        weight: 10,
        steps: [
          { kind: "charge" },
          {
            kind: "attack",
            name: { zh: "普通攻击", en: "Basic Attack" },
            damage: 14,
            momentum: 6,
          },
        ],
      },
      {
        id: "heavy",
        weight: 6,
        steps: [
          { kind: "charge" },
          { kind: "charge" },
          {
            kind: "attack",
            name: { zh: "重击", en: "Heavy Blow" },
            damage: 20,
            momentum: 8,
          },
        ],
      },
    ],
  },
  goblin_brute: {
    id: "goblin_brute",
    name: { zh: "哥布林壮汉", en: "Goblin Brute" },
    icon: "\uD83D\uDC7A\u200D\uD83D\uDCAA",
    maxHp: 45,
    maxMp: 10,
    damage: 12,
    momentum: 7,
    patterns: [
      {
        id: "press",
        weight: 10,
        steps: [
          {
            kind: "attack",
            name: { zh: "普通攻击", en: "Basic Attack" },
            damage: 12,
            momentum: 7,
          },
          {
            kind: "attack",
            name: { zh: "普通攻击", en: "Basic Attack" },
            damage: 12,
            momentum: 7,
          },
        ],
      },
      {
        id: "heavy",
        weight: 5,
        steps: [
          { kind: "charge" },
          { kind: "charge" },
          {
            kind: "attack",
            name: { zh: "重击", en: "Heavy Blow" },
            damage: 30,
            momentum: 12,
          },
        ],
      },
    ],
  },
};
