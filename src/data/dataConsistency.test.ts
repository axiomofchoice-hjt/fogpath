import { describe, expect, it } from "vitest";
import { dungeons, enemyDefs, items, loot, rooms, skills } from "./config";
import { testBattleConfigs } from "./battleTestConfigs";
import { initialPlayer } from "../state/init";
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

  it("铁剑提供普通攻击动作（无动作的武器会让玩家失去全部攻击按钮）", () => {
    const act = items.iron_sword.actions;
    expect(act).toBeDefined();
    expect(act!.some((a) => a.skillId === "basic_attack")).toBe(true);
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

  it("出口指向存在的房间，且双向连通", () => {
    for (const room of Object.values(rooms)) {
      for (const rid of room.exits) {
        expect(rooms[rid], `${room.id} -> ${rid}`).toBeDefined();
        expect(rooms[rid].exits, `${room.id} -> ${rid} 需反向出口`).toContain(room.id);
      }
    }
  });

  it("商店货架物品都存在且价格为正", () => {
    for (const room of Object.values(rooms)) {
      for (const s of room.shopItems ?? []) {
        expect(items[s.itemId], `${room.id} -> ${s.itemId}`).toBeDefined();
        expect(s.price, `${room.id} -> ${s.itemId}`).toBeGreaterThan(0);
      }
    }
  });

  it("房间有唯一地图坐标", () => {
    const seen = new Set<string>();
    for (const room of Object.values(rooms)) {
      const key = `${room.pos.x},${room.pos.y}`;
      expect(seen.has(key), `${room.id} 坐标 ${key} 重复`).toBe(false);
      seen.add(key);
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

describe("地牢配置", () => {
  it("地牢 ID 与键一致", () => {
    for (const [id, d] of Object.entries(dungeons)) {
      expect(d.id).toBe(id);
    }
  });

  it("至少有一个可选地牢（森林）", () => {
    expect(dungeons.forest).toBeDefined();
    expect(dungeons.forest.difficulty).toBeGreaterThan(0);
  });

  it("地牢引用：敌人池/Boss 都在敌人表中，物品池在物品表中，森林 Boss 为哥布林王", () => {
    for (const d of Object.values(dungeons)) {
      expect(d.size.w * d.size.h).toBeGreaterThan(0);
      for (const e of d.enemyPool) {
        expect(enemyDefs[e.enemyId], `${d.id} -> ${e.enemyId}`).toBeDefined();
      }
      for (const id of d.itemPool) {
        expect(items[id], `${d.id} -> ${id}`).toBeDefined();
      }
      expect(enemyDefs[d.bossId], `${d.id} -> ${d.bossId}`).toBeDefined();
    }
    expect(dungeons.forest.bossId).toBe("goblin_king");
  });

  it("每个地牢敌人池/Boss 都有掉落表", () => {
    const ids = new Set<string>();
    for (const d of Object.values(dungeons)) {
      ids.add(d.bossId);
      for (const e of d.enemyPool) ids.add(e.enemyId);
    }
    for (const id of ids) {
      expect(loot[id], `敌人 ${id} 缺少掉落表`).toBeDefined();
    }
  });
});
