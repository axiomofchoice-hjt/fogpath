import { describe, expect, it } from "vitest";
import { validateDungeons, validateEnemies, validateItems, validateLoot, validateRooms, validateSkills } from "./validate";

describe("配置校验", () => {
  it("非法技能：未知类型被拒绝", () => {
    expect(() =>
      validateSkills({ bomb: { id: "bomb", name: { zh: "a", en: "b" }, icon: "x", type: "chaos", mpCost: 1 } }),
    ).toThrow(/未知技能类型/);
  });

  it("非法技能：id 与键不一致被拒绝", () => {
    expect(() =>
      validateSkills({ foo: { id: "bar", name: { zh: "a", en: "b" }, icon: "x", type: "physical", mpCost: 1 } }),
    ).toThrow(/不一致/);
  });

  it("非法物品：技能引用不存在被拒绝", () => {
    expect(() =>
      validateItems(
        { sword: { id: "sword", name: { zh: "a", en: "b" }, icon: "x", type: "equipment", description: { zh: "a", en: "b" }, rarity: 1, actions: [{ skillId: "nope", damage: 1, momentum: 1 }] } },
        {},
      ),
    ).toThrow(/不存在的技能/);
  });

  it("非法物品：缺失双语描述被拒绝", () => {
    expect(() =>
      validateItems(
        { sword: { id: "sword", name: { zh: "a" }, icon: "x", type: "equipment", description: { zh: "a", en: "b" }, rarity: 1 } },
        {},
      ),
    ).toThrow(/\.en/);
  });

  it("非法敌人：空模式数组被拒绝", () => {
    expect(() =>
      validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, patterns: [] } }),
    ).toThrow(/patterns/);
  });

  it("非法敌人：未知步骤类型被拒绝", () => {
    expect(() =>
      validateEnemies({
        goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "teleport" }] }] },
      }),
    ).toThrow(/未知步骤类型/);
  });

  it("非法敌人：攻击步骤数值为零被拒绝", () => {
    expect(() =>
      validateEnemies({
        goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "attack", name: { zh: "a", en: "b" }, damage: 0, momentum: 1 }] }] },
      }),
    ).toThrow(/大于 0/);
  });

  it("非法房间：物品引用不存在被拒绝", () => {
    expect(() =>
      validateRooms(
        { room: { id: "room", name: { zh: "a", en: "b" }, description: { zh: "a", en: "b" }, area: { zh: "a", en: "b" }, isSafeRoom: true, itemIds: ["ghost_item"], exits: [], pos: { x: 0, y: 0 }, npc: { name: { zh: "a", en: "b" }, icon: "x", dialogue: [{ zh: "a", en: "b" }] } } },
        {},
      ),
    ).toThrow(/不存在的物品/);
  });

  it("非法房间：出口引用不存在的房间被拒绝", () => {
    expect(() =>
      validateRooms(
        { room: { id: "room", name: { zh: "a", en: "b" }, description: { zh: "a", en: "b" }, area: { zh: "a", en: "b" }, isSafeRoom: true, itemIds: [], exits: ["nope"], pos: { x: 0, y: 0 } } },
        {},
      ),
    ).toThrow(/不存在的房间/);
  });

  it("Boss 标记（isBoss）合法", () => {
    const out = validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, isBoss: true, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }] } });
    expect(out.goblin.isBoss).toBe(true);
  });

  it("未实现功能字段被拒绝：技能 effects（特殊效果规划中）", () => {
    expect(() =>
      validateSkills({ hit: { id: "hit", name: { zh: "a", en: "b" }, icon: "x", type: "physical", mpCost: 1, effects: ["poison"] } }),
    ).toThrow(/未知字段/);
  });

  it("蓄力步携带攻击数值被拒绝", () => {
    expect(() =>
      validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge", damage: 5 }] }] } }),
    ).toThrow(/蓄力步不允许额外字段/);
  });

  it("非法地牢：敌人池为空被拒绝", () => {
    expect(() =>
      validateDungeons(
        { forest: { id: "forest", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1, size: { w: 6, h: 6 }, enemyPool: [], itemPool: [], bossId: "b" } },
        {},
        {},
      ),
    ).toThrow(/enemyPool/);
  });

  it("非法掉落表：物品不存在被拒绝", () => {
    expect(() =>
      validateLoot(
        { goblin: { items: [{ itemId: "ghost", chance: 0.5 }], gold: [0, 5] } },
        {},
        { goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 1, maxMp: 0, damage: 1, momentum: 1, patterns: [] } },
      ),
    ).toThrow(/不存在的物品/);
  });

  it("非法掉落表：敌人未定义被拒绝", () => {
    expect(() => validateLoot({ ghost: { items: [], gold: [0, 5] } }, {}, {})).toThrow(/不是已定义的敌人/);
  });

  it("合法数据通过", () => {
    const skills = validateSkills({ hit: { id: "hit", name: { zh: "a", en: "b" }, icon: "x", type: "physical", mpCost: 1 } });
    const items = validateItems({ sword: { id: "sword", name: { zh: "a", en: "b" }, icon: "x", type: "equipment", description: { zh: "a", en: "b" }, rarity: 1, actions: [{ skillId: "hit", damage: 1, momentum: 1 }] } }, skills);
    validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }, { kind: "attack", name: { zh: "a", en: "b" }, damage: 1, momentum: 1 }] }] } });
    validateRooms({ room: { id: "room", name: { zh: "a", en: "b" }, description: { zh: "a", en: "b" }, area: { zh: "a", en: "b" }, isSafeRoom: true, itemIds: ["sword"], exits: [], pos: { x: 0, y: 0 }, npc: { name: { zh: "a", en: "b" }, icon: "x", dialogue: [{ zh: "a", en: "b" }] } } }, items);
    const enemies = validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }] } });
    validateDungeons({ forest: { id: "forest", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1, size: { w: 6, h: 6 }, enemyPool: [{ enemyId: "goblin", minDepth: 0, maxDepth: 2, weight: 1 }], itemPool: ["sword"], bossId: "goblin" } }, enemies, items);
    validateLoot({ goblin: { items: [{ itemId: "sword", chance: 0.5 }], gold: [1, 5] } }, items, enemies);
  });
});
