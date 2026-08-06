import { describe, expect, it } from "vitest";
import { validateEnemies, validateItems, validateRooms, validateSkills } from "./validate";

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
        { room: { id: "room", name: { zh: "a", en: "b" }, description: { zh: "a", en: "b" }, area: { zh: "a", en: "b" }, isSafeRoom: true, itemIds: ["ghost_item"], npc: { name: { zh: "a", en: "b" }, icon: "x", dialogue: [{ zh: "a", en: "b" }] } } },
        {},
      ),
    ).toThrow(/不存在的物品/);
  });

  it("未实现功能字段被拒绝：敌人 isBoss（Boss 系统规划中）", () => {
    expect(() =>
      validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, isBoss: true, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }] } }),
    ).toThrow(/isBoss.*未知字段|未知字段/);
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

  it("合法数据通过", () => {
    const skills = validateSkills({ hit: { id: "hit", name: { zh: "a", en: "b" }, icon: "x", type: "physical", mpCost: 1 } });
    const items = validateItems({ sword: { id: "sword", name: { zh: "a", en: "b" }, icon: "x", type: "equipment", description: { zh: "a", en: "b" }, rarity: 1, actions: [{ skillId: "hit", damage: 1, momentum: 1 }] } }, skills);
    validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, momentum: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }, { kind: "attack", name: { zh: "a", en: "b" }, damage: 1, momentum: 1 }] }] } });
    validateRooms({ room: { id: "room", name: { zh: "a", en: "b" }, description: { zh: "a", en: "b" }, area: { zh: "a", en: "b" }, isSafeRoom: true, itemIds: ["sword"], npc: { name: { zh: "a", en: "b" }, icon: "x", dialogue: [{ zh: "a", en: "b" }] } } }, items);
  });
});
