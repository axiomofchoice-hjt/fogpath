import { describe, expect, it } from "vitest";
import { items } from "./items";
import { skills } from "./skills";
import { enemyDefs } from "./enemies";
import { testBattleConfigs } from "./battleTestConfigs";
import { rooms } from "./rooms";
import { initialPlayer } from "../state/gameReducer";
import { EQUIP_SLOT_COUNT } from "../types";

describe("物品定义", () => {
  it("物品 ID 与键一致", () => {
    for (const [id, item] of Object.entries(items)) {
      expect(item.id).toBe(id);
    }
  });

  it("动作引用的技能都存在", () => {
    for (const item of Object.values(items)) {
      for (const act of item.actions ?? []) {
        expect(skills[act.skillId], `${item.id} -> ${act.skillId}`).toBeDefined();
      }
    }
  });

  it("盾牌存在且至少一面", () => {
    expect(Object.values(items).filter((i) => i.isShield).length).toBeGreaterThan(0);
  });
});

describe("敌人定义", () => {
  it("敌人 ID 与键一致", () => {
    for (const [id, def] of Object.entries(enemyDefs)) {
      expect(def.id).toBe(id);
    }
  });

  it("攻击模式合法：模式非空、ID 唯一、权重与步数有效、攻击步数值为正", () => {
    for (const def of Object.values(enemyDefs)) {
      expect(def.patterns.length, def.id).toBeGreaterThan(0);
      const ids = def.patterns.map((p) => p.id);
      expect(new Set(ids).size, def.id).toBe(ids.length);
      for (const pattern of def.patterns) {
        expect(pattern.weight, `${def.id}:${pattern.id}`).toBeGreaterThan(0);
        expect(pattern.steps.length, `${def.id}:${pattern.id}`).toBeGreaterThan(0);
        for (const step of pattern.steps) {
          if (step.kind === "attack") {
            expect(step.damage, `${def.id}:${pattern.id}`).toBeGreaterThan(0);
            expect(step.momentum, `${def.id}:${pattern.id}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe("测试场景配置", () => {
  it("配置引用的敌人都存在", () => {
    for (const [scenarioId, config] of Object.entries(testBattleConfigs)) {
      for (const enemyId of config.enemies) {
        expect(enemyDefs[enemyId], `${scenarioId} -> ${enemyId}`).toBeDefined();
      }
    }
  });

  it("装备覆盖为 6 格且物品都存在", () => {
    for (const [scenarioId, config] of Object.entries(testBattleConfigs)) {
      if (!config.equipment) continue;
      expect(config.equipment, scenarioId).toHaveLength(EQUIP_SLOT_COUNT);
      for (const id of config.equipment) {
        if (id) expect(items[id], `${scenarioId} -> ${id}`).toBeDefined();
      }
    }
  });
});

describe("房间与初始玩家", () => {
  it("房间物品都存在", () => {
    for (const room of Object.values(rooms)) {
      for (const id of room.itemIds) {
        expect(items[id], `${room.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it("初始装备为 6 格且物品都存在", () => {
    const p = initialPlayer();
    expect(p.equipment).toHaveLength(EQUIP_SLOT_COUNT);
    for (const id of p.equipment) {
      if (id) expect(items[id]).toBeDefined();
    }
    for (const entry of p.inventory) {
      expect(items[entry.itemId]).toBeDefined();
    }
  });
});
