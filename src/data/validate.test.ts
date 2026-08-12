import { describe, expect, it } from "vitest";
import type { EnemyDef } from "../types";
import { validateDungeons, validateEnemies, validateItems, validateLoot, validateRooms, validateSkills } from "./validate";

/** 静态布局测试用敌人表：boss 必含（bossId 校验最先触发） */
const ENEMIES: Record<string, EnemyDef> = {
  boss: {
    id: "boss", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, isBoss: true,
    patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }],
  },
  goblin: {
    id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1,
    patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }],
  },
};

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
        { sword: { id: "sword", name: { zh: "a", en: "b" }, icon: "x", type: "equipment", description: { zh: "a", en: "b" }, rarity: 1, actions: [{ skillId: "nope", damage: 1 }] } },
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
      validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, patterns: [] } }),
    ).toThrow(/patterns/);
  });

  it("非法敌人：未知步骤类型被拒绝", () => {
    expect(() =>
      validateEnemies({
        goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "teleport" }] }] },
      }),
    ).toThrow(/未知步骤类型/);
  });

  it("非法敌人：攻击步骤数值为零被拒绝", () => {
    expect(() =>
      validateEnemies({
        goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "attack", name: { zh: "a", en: "b" }, damage: 0 }] }] },
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
    const out = validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, isBoss: true, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }] } });
    expect(out.goblin.isBoss).toBe(true);
  });

  it("未实现功能字段被拒绝：技能 effects（特殊效果规划中）", () => {
    expect(() =>
      validateSkills({ hit: { id: "hit", name: { zh: "a", en: "b" }, icon: "x", type: "physical", mpCost: 1, effects: ["poison"] } }),
    ).toThrow(/未知字段/);
  });

  it("蓄力步携带攻击数值被拒绝", () => {
    expect(() =>
      validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge", damage: 5 }] }] } }),
    ).toThrow(/蓄力步不允许额外字段/);
  });

  it("非法地牢：敌人池为空被拒绝", () => {
    expect(() =>
      validateDungeons(
        { forest: { id: "forest", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1, size: { w: 6, h: 6 }, roomCount: 8, enemyPool: [], itemPool: [], bossId: "b" } },
        { b: { id: "b", name: { zh: "a", en: "b" }, icon: "x", maxHp: 1, maxMp: 0, damage: 1, patterns: [] } },
        {},
      ),
    ).toThrow(/enemyPool/);
  });

  it("非法掉落表：物品不存在被拒绝", () => {
    expect(() =>
      validateLoot(
        { goblin: { items: [{ itemId: "ghost", chance: 0.5 }], gold: [0, 5] } },
        {},
        { goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 1, maxMp: 0, damage: 1, patterns: [] } },
      ),
    ).toThrow(/不存在的物品/);
  });

  it("非法掉落表：敌人未定义被拒绝", () => {
    expect(() => validateLoot({ ghost: { items: [], gold: [0, 5] } }, {}, {})).toThrow(/不是已定义的敌人/);
  });

  it("合法数据通过", () => {
    const skills = validateSkills({ hit: { id: "hit", name: { zh: "a", en: "b" }, icon: "x", type: "physical", mpCost: 1 } });
    const items = validateItems({ sword: { id: "sword", name: { zh: "a", en: "b" }, icon: "x", type: "equipment", description: { zh: "a", en: "b" }, rarity: 1, actions: [{ skillId: "hit", damage: 1 }] } }, skills);
    validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }, { kind: "attack", name: { zh: "a", en: "b" }, damage: 1 }] }] } });
    validateRooms({ room: { id: "room", name: { zh: "a", en: "b" }, description: { zh: "a", en: "b" }, area: { zh: "a", en: "b" }, isSafeRoom: true, itemIds: ["sword"], exits: [], pos: { x: 0, y: 0 }, npc: { name: { zh: "a", en: "b" }, icon: "x", dialogue: [{ zh: "a", en: "b" }] } } }, items);
    const enemies = validateEnemies({ goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }] } });
    validateDungeons({ forest: { id: "forest", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1, size: { w: 6, h: 6 }, roomCount: 8, enemyPool: [{ enemyId: "goblin", minDepth: 0, maxDepth: 2, weight: 1 }], itemPool: ["sword"], bossId: "goblin" } }, enemies, items);
    validateLoot({ goblin: { items: [{ itemId: "sword", chance: 0.5 }], gold: [1, 5] } }, items, enemies);
  });

  it("静态布局地牢：合法数据通过（layout/rooms/guide）", () => {
    const enemies = validateEnemies({
      goblin: { id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, patterns: [{ id: "p", weight: 1, steps: [{ kind: "attack", name: { zh: "a", en: "b" }, damage: 1 }] }] },
      boss: { id: "boss", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1, isBoss: true, patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }] },
    });
    const items = validateItems({}, {});
    const out = validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        layout: [["", "r2"], ["r1", "r3"]],
        rooms: {
          r1: { type: "entrance", enemyIds: [], itemIds: [] },
          r2: { type: "normal", enemyIds: ["goblin"], itemIds: [] },
          r3: { type: "boss", enemyIds: ["boss"], itemIds: [] },
        },
        guide: {
          icon: "x", name: { zh: "向导", en: "Guide" },
          roomHints: { r1: { zh: "a", en: "b" }, r2: { zh: "a", en: "b" } },
          battleHints: { r2: { zh: "a", en: "b" } },
        },
        bossId: "boss",
      },
    }, enemies, items);
    expect(out.camp.layout).toEqual([["", "r2"], ["r1", "r3"]]);
    expect(out.camp.size).toBeUndefined();
    expect(out.camp.guide?.roomHints.r1).toEqual({ zh: "a", en: "b" });
  });

  it("静态布局：单元格引用不存在的房间定义被拒绝", () => {
    expect(() => validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        layout: [["r1", "ghost"]],
        rooms: { r1: { type: "entrance", enemyIds: [], itemIds: [] } },
        bossId: "boss",
      },
    }, ENEMIES, {})).toThrow(/不存在的房间定义/);
  });

  it("静态布局：必须且只能一个入口和一个 Boss 房", () => {
    const base = {
      id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
      layout: [["r1", "r2"]],
      rooms: {
        r1: { type: "entrance", enemyIds: [], itemIds: [] },
        r2: { type: "entrance", enemyIds: [], itemIds: [] },
      },
      bossId: "boss",
    };
    expect(() => validateDungeons({ camp: base }, ENEMIES, {})).toThrow(/一个入口房/);
    expect(() =>
      validateDungeons(
        { camp: { ...base, rooms: { r1: { type: "normal", enemyIds: [], itemIds: [] }, r2: { type: "boss", enemyIds: ["boss"], itemIds: [] } } } },
        ENEMIES,
        {}
      )
    ).toThrow(/入口房/);
    expect(() =>
      validateDungeons({
        camp: {
          ...base,
          rooms: { r1: { type: "entrance", enemyIds: [], itemIds: [] }, r2: { type: "normal", enemyIds: [], itemIds: [] } },
        },
      }, ENEMIES, {})
    ).toThrow(/Boss 房/);
  });

  it("静态布局：不连通被拒绝", () => {
    expect(() => validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        layout: [["r1", "", "r2"]],
        rooms: {
          r1: { type: "entrance", enemyIds: [], itemIds: [] },
          r2: { type: "boss", enemyIds: ["boss"], itemIds: [] },
        },
        bossId: "boss",
      },
    }, ENEMIES, {})).toThrow(/不连通/);
  });

  it("静态布局：Boss 房缺少 bossId 敌人被拒绝", () => {
    expect(() => validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        layout: [["r1", "r2"]],
        rooms: {
          r1: { type: "entrance", enemyIds: [], itemIds: [] },
          r2: { type: "boss", enemyIds: ["goblin"], itemIds: [] },
        },
        bossId: "boss",
      },
    }, ENEMIES, {})).toThrow(/Boss 房必须包含/);
  });

  it("静态布局：随机生成字段与 layout 互斥", () => {
    expect(() => validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        layout: [["r1"]], rooms: { r1: { type: "entrance", enemyIds: [], itemIds: [] } },
        size: { w: 5, h: 5 }, bossId: "boss",
      },
    }, ENEMIES, {})).toThrow(/不允许 size/);
    expect(() => validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        layout: [["r1"]],
        bossId: "boss",
      },
    }, ENEMIES, {})).toThrow(/必须提供 rooms/);
    expect(() => validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        bossId: "boss",
      },
    }, ENEMIES, {})).toThrow(/必须提供 size/);
  });

  it("guide 提示键必须指向布局中的房间", () => {
    expect(() => validateDungeons({
      camp: {
        id: "camp", name: { zh: "a", en: "b" }, icon: "x", description: { zh: "a", en: "b" }, difficulty: 1,
        layout: [["r1", "r2"]],
        rooms: {
          r1: { type: "entrance", enemyIds: [], itemIds: [] },
          r2: { type: "boss", enemyIds: ["boss"], itemIds: [] },
        },
        guide: {
          icon: "x", name: { zh: "a", en: "b" },
          roomHints: { r9: { zh: "a", en: "b" } },
          battleHints: {},
        },
        bossId: "boss",
      },
    }, ENEMIES, {})).toThrow(/不在布局中的房间/);
  });

  it("敌人动作集：名称不在任何模式步攻击名中被拒绝", () => {
    expect(() =>
      validateEnemies({
        goblin: {
          id: "goblin", name: { zh: "a", en: "b" }, icon: "x", maxHp: 10, maxMp: 0, damage: 1,
          moves: [{ name: { zh: "闪电", en: "Bolt" }, charge: 0 }],
          patterns: [{ id: "p", weight: 1, steps: [{ kind: "charge" }] }],
        },
      }),
    ).toThrow(/不在任何模式步的攻击名中/);
  });

  it("物品类型 pet 合法（背包精灵）", () => {
    const out = validateItems(
      { bag_spirit: { id: "bag_spirit", name: { zh: "a", en: "b" }, icon: "x", type: "pet", description: { zh: "a", en: "b" }, rarity: 1 } },
      {},
    );
    expect(out.bag_spirit.type).toBe("pet");
  });
});
