import type { DungeonDef, EnemyDef, ItemDef, LootTable, RoomDef, SkillDef } from "../types";

/**
 * 轻量配置校验：JSON 数据没有编译期类型，在加载时逐字段检查，
 * 失败时抛出带路径的错误信息（如 `[config] enemies.json: goblin.patterns[0]`）。
 * 未实现的 GDD 功能字段（特殊效果、AOE 等）一律按未知字段拒绝——
 * 数据层不允许出现代码尚未实现的内容。
 */

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(path: string, msg: string): never {
  throw new Error(`[config] ${path}: ${msg}`);
}

/** 严格对象检查：字段白名单之外的内容（未实现功能/拼写错误）直接拒绝 */
function assertRecord(v: unknown, path: string, fields?: readonly string[]): AnyRecord {
  if (!isRecord(v)) fail(path, "应为对象");
  if (fields) {
    for (const key of Object.keys(v)) {
      if (!fields.includes(key)) {
        fail(`${path}.${key}`, `未知字段（未实现的 GDD 功能不允许出现在配置中）`);
      }
    }
  }
  return v;
}

function assertString(v: unknown, path: string): string {
  if (typeof v !== "string" || v.length === 0) fail(path, "应为非空字符串");
  return v;
}

function assertNumber(v: unknown, path: string, opts?: { gt?: number; gte?: number; lte?: number }): number {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(path, "应为数字");
  if (opts?.gt !== undefined && v <= opts.gt) fail(path, `应大于 ${opts.gt}`);
  if (opts?.gte !== undefined && v < opts.gte) fail(path, `应不小于 ${opts.gte}`);
  if (opts?.lte !== undefined && v > opts.lte) fail(path, `应不大于 ${opts.lte}`);
  return v;
}

function assertBoolean(v: unknown, path: string): boolean {
  if (typeof v !== "boolean") fail(path, "应为布尔值");
  return v;
}

function assertL(v: unknown, path: string): { zh: string; en: string } {
  const rec = assertRecord(v, path, ["zh", "en"]);
  return { zh: assertString(rec.zh, `${path}.zh`), en: assertString(rec.en, `${path}.en`) };
}

function assertSkillId(v: unknown, path: string, skillIds: Set<string>): string {
  const id = assertString(v, path);
  if (!skillIds.has(id)) fail(path, `引用了不存在的技能 "${id}"`);
  return id;
}

function assertItemId(v: unknown, path: string, itemIds: Set<string>): string {
  const id = assertString(v, path);
  if (!itemIds.has(id)) fail(path, `引用了不存在的物品 "${id}"`);
  return id;
}

function assertKeyMatch(key: string, id: string, path: string): void {
  if (key !== id) fail(path, `键 "${key}" 与 id "${id}" 不一致`);
}

export function validateSkills(raw: unknown): Record<string, SkillDef> {
  const root = assertRecord(raw, "skills.json");
  const out: Record<string, SkillDef> = {};
  for (const [key, value] of Object.entries(root)) {
    const path = `skills.json:${key}`;
    const rec = assertRecord(value, path, ["id", "name", "icon", "type", "mpCost"]);
    const id = assertString(rec.id, `${path}.id`);
    assertKeyMatch(key, id, path);
    const type = assertString(rec.type, `${path}.type`);
    if (type !== "physical" && type !== "magic") fail(`${path}.type`, `未知技能类型 "${type}"`);
    out[key] = {
      id,
      name: assertL(rec.name, `${path}.name`),
      icon: assertString(rec.icon, `${path}.icon`),
      type,
      mpCost: assertNumber(rec.mpCost, `${path}.mpCost`, { gte: 0 }),
    };
  }
  return out;
}

export function validateItems(raw: unknown, skills: Record<string, SkillDef>): Record<string, ItemDef> {
  const root = assertRecord(raw, "items.json");
  const skillIds = new Set(Object.keys(skills));
  const out: Record<string, ItemDef> = {};
  for (const [key, value] of Object.entries(root)) {
    const path = `items.json:${key}`;
    const rec = assertRecord(value, path, [
      "id", "name", "icon", "type", "description", "rarity",
      "atk", "def", "spd", "hpRestore", "mpRestore", "isShield", "actions",
    ]);
    const id = assertString(rec.id, `${path}.id`);
    assertKeyMatch(key, id, path);
    const type = assertString(rec.type, `${path}.type`);
    if (type !== "equipment" && type !== "consumable" && type !== "currency") {
      fail(`${path}.type`, `未知物品类型 "${type}"`);
    }
    const item: ItemDef = {
      id,
      name: assertL(rec.name, `${path}.name`),
      icon: assertString(rec.icon, `${path}.icon`),
      type,
      description: assertL(rec.description, `${path}.description`),
      rarity: assertNumber(rec.rarity, `${path}.rarity`, { gte: 1 }),
    };
    if (rec.atk !== undefined) item.atk = assertNumber(rec.atk, `${path}.atk`, { gte: 0 });
    if (rec.def !== undefined) item.def = assertNumber(rec.def, `${path}.def`, { gte: 0 });
    if (rec.spd !== undefined) item.spd = assertNumber(rec.spd, `${path}.spd`, { gte: 0 });
    if (rec.hpRestore !== undefined) {
      item.hpRestore = assertNumber(rec.hpRestore, `${path}.hpRestore`, { gt: 0 });
    }
    if (rec.mpRestore !== undefined) {
      item.mpRestore = assertNumber(rec.mpRestore, `${path}.mpRestore`, { gt: 0 });
    }
    if (rec.isShield !== undefined) item.isShield = assertBoolean(rec.isShield, `${path}.isShield`);
    if (rec.actions !== undefined) {
      if (!Array.isArray(rec.actions) || rec.actions.length === 0) {
        fail(`${path}.actions`, "应为非空数组");
      }
      item.actions = rec.actions.map((a, i) => {
        const apath = `${path}.actions[${i}]`;
        const arec = assertRecord(a, apath, ["skillId", "damage", "momentum"]);
        return {
          skillId: assertSkillId(arec.skillId, `${apath}.skillId`, skillIds),
          damage: assertNumber(arec.damage, `${apath}.damage`, { gt: 0 }),
          momentum: assertNumber(arec.momentum, `${apath}.momentum`, { gt: 0 }),
        };
      });
    }
    out[key] = item;
  }
  return out;
}

export function validateEnemies(raw: unknown): Record<string, EnemyDef> {
  const root = assertRecord(raw, "enemies.json");
  const out: Record<string, EnemyDef> = {};
  for (const [key, value] of Object.entries(root)) {
    const path = `enemies.json:${key}`;
    const rec = assertRecord(value, path, [
      "id", "name", "icon", "maxHp", "maxMp", "damage", "momentum", "isBoss", "patterns",
    ]);
    const id = assertString(rec.id, `${path}.id`);
    assertKeyMatch(key, id, path);
    if (!Array.isArray(rec.patterns) || rec.patterns.length === 0) {
      fail(`${path}.patterns`, "应为非空数组");
    }
    const patternIds = new Set<string>();
    const patterns = rec.patterns.map((p, pi) => {
      const ppath = `${path}.patterns[${pi}]`;
      const prec = assertRecord(p, ppath, ["id", "weight", "steps"]);
      const pid = assertString(prec.id, `${ppath}.id`);
      if (patternIds.has(pid)) fail(ppath, `模式 id "${pid}" 重复`);
      patternIds.add(pid);
      if (!Array.isArray(prec.steps) || prec.steps.length === 0) {
        fail(`${ppath}.steps`, "应为非空数组");
      }
      return {
        id: pid,
        weight: assertNumber(prec.weight, `${ppath}.weight`, { gt: 0 }),
        steps: prec.steps.map((s, si) => {
          const spath = `${ppath}.steps[${si}]`;
          const srec = assertRecord(s, spath, ["kind", "name", "damage", "momentum"]);
          const kind = assertString(srec.kind, `${spath}.kind`);
          if (kind === "charge") {
            const extra = Object.keys(srec).filter((k) => k !== "kind");
            if (extra.length > 0) fail(spath, `蓄力步不允许额外字段 ${extra.join(",")}`);
            return { kind: "charge" as const };
          }
          if (kind === "attack") {
            return {
              kind: "attack" as const,
              name: assertL(srec.name, `${spath}.name`),
              damage: assertNumber(srec.damage, `${spath}.damage`, { gt: 0 }),
              momentum: assertNumber(srec.momentum, `${spath}.momentum`, { gt: 0 }),
            };
          }
          fail(spath, `未知步骤类型 "${kind}"`);
        }),
      };
    });
    out[key] = {
      id,
      name: assertL(rec.name, `${path}.name`),
      icon: assertString(rec.icon, `${path}.icon`),
      maxHp: assertNumber(rec.maxHp, `${path}.maxHp`, { gt: 0 }),
      maxMp: assertNumber(rec.maxMp, `${path}.maxMp`, { gte: 0 }),
      damage: assertNumber(rec.damage, `${path}.damage`, { gte: 0 }),
      momentum: assertNumber(rec.momentum, `${path}.momentum`, { gte: 0 }),
      ...(rec.isBoss !== undefined ? { isBoss: assertBoolean(rec.isBoss, `${path}.isBoss`) } : {}),
      patterns,
    };
  }
  return out;
}

export function validateRooms(raw: unknown, items: Record<string, ItemDef>): Record<string, RoomDef> {
  const root = assertRecord(raw, "rooms.json");
  const itemIds = new Set(Object.keys(items));
  const out: Record<string, RoomDef> = {};
  for (const [key, value] of Object.entries(root)) {
    const path = `rooms.json:${key}`;
    const rec = assertRecord(value, path, [
      "id", "name", "description", "area", "isSafeRoom", "itemIds", "exits", "pos", "npc", "shopItems",
    ]);
    const id = assertString(rec.id, `${path}.id`);
    assertKeyMatch(key, id, path);
    if (!Array.isArray(rec.itemIds)) fail(`${path}.itemIds`, "应为数组");
    if (!Array.isArray(rec.exits)) fail(`${path}.exits`, "应为数组");
    const posRec = assertRecord(rec.pos, `${path}.pos`, ["x", "y"]);
    const npcRec = rec.npc === undefined ? undefined : assertRecord(rec.npc, `${path}.npc`, ["name", "icon", "dialogue"]);
    if (npcRec) {
      if (!Array.isArray(npcRec.dialogue) || npcRec.dialogue.length === 0) {
        fail(`${path}.npc.dialogue`, "应为非空数组");
      }
    }
    let shopItems: { itemId: string; price: number }[] | undefined;
    if (rec.shopItems !== undefined) {
      if (!Array.isArray(rec.shopItems) || rec.shopItems.length === 0) {
        fail(`${path}.shopItems`, "应为非空数组");
      }
      shopItems = rec.shopItems.map((s, i) => {
        const spath = `${path}.shopItems[${i}]`;
        const srec = assertRecord(s, spath, ["itemId", "price"]);
        return {
          itemId: assertItemId(srec.itemId, `${spath}.itemId`, itemIds),
          price: assertNumber(srec.price, `${spath}.price`, { gt: 0 }),
        };
      });
    }
    out[key] = {
      id,
      name: assertL(rec.name, `${path}.name`),
      description: assertL(rec.description, `${path}.description`),
      area: assertL(rec.area, `${path}.area`),
      isSafeRoom: assertBoolean(rec.isSafeRoom, `${path}.isSafeRoom`),
      itemIds: rec.itemIds.map((iid: unknown, i: number) => assertItemId(iid, `${path}.itemIds[${i}]`, itemIds)),
      exits: rec.exits.map((rid: unknown, i: number) => assertString(rid, `${path}.exits[${i}]`)),
      pos: {
        x: assertNumber(posRec.x, `${path}.pos.x`),
        y: assertNumber(posRec.y, `${path}.pos.y`),
      },
      ...(npcRec
        ? {
            npc: {
              name: assertL(npcRec.name, `${path}.npc.name`),
              icon: assertString(npcRec.icon, `${path}.npc.icon`),
              dialogue: (npcRec.dialogue as unknown[]).map((d, i) => assertL(d, `${path}.npc.dialogue[${i}]`)),
            },
          }
        : {}),
      ...(shopItems ? { shopItems } : {}),
    };
  }
  // 出口交叉引用：房间必须都存在（双向连通由数据保证，此处只查引用）
  for (const [key, room] of Object.entries(out)) {
    for (const rid of room.exits) {
      if (!out[rid]) fail(`rooms.json:${key}.exits`, `出口引用了不存在的房间 "${rid}"`);
    }
  }
  return out;
}

export function validateDungeons(
  raw: unknown,
  enemies: Record<string, EnemyDef>,
  items: Record<string, ItemDef>
): Record<string, DungeonDef> {
  const root = assertRecord(raw, "dungeons.json");
  const enemyIds = new Set(Object.keys(enemies));
  const itemIds = new Set(Object.keys(items));
  const out: Record<string, DungeonDef> = {};
  for (const [key, value] of Object.entries(root)) {
    const path = `dungeons.json:${key}`;
    const rec = assertRecord(value, path, [
      "id", "name", "icon", "description", "difficulty", "size", "enemyPool", "itemPool", "bossId",
    ]);
    const id = assertString(rec.id, `${path}.id`);
    assertKeyMatch(key, id, path);
    const sizeRec = assertRecord(rec.size, `${path}.size`, ["w", "h"]);
    const sizeW = assertNumber(sizeRec.w, `${path}.size.w`, { gt: 0 });
    const sizeH = assertNumber(sizeRec.h, `${path}.size.h`, { gt: 0 });
    if (!Array.isArray(rec.enemyPool) || rec.enemyPool.length === 0) {
      fail(`${path}.enemyPool`, "应为非空数组");
    }
    const enemyPool = rec.enemyPool.map((e, i) => {
      const epath = `${path}.enemyPool[${i}]`;
      const erec = assertRecord(e, epath, ["enemyId", "minDepth", "maxDepth", "weight"]);
      const enemyId = assertString(erec.enemyId, `${epath}.enemyId`);
      if (!enemyIds.has(enemyId)) fail(`${epath}.enemyId`, `引用了不存在的敌人 "${enemyId}"`);
      const minDepth = assertNumber(erec.minDepth, `${epath}.minDepth`, { gte: 0 });
      const maxDepth = assertNumber(erec.maxDepth, `${epath}.maxDepth`, { gte: minDepth });
      return {
        enemyId,
        minDepth,
        maxDepth,
        weight: assertNumber(erec.weight, `${epath}.weight`, { gt: 0 }),
      };
    });
    if (!Array.isArray(rec.itemPool)) fail(`${path}.itemPool`, "应为数组");
    if (!enemyIds.has(rec.bossId as string)) {
      fail(`${path}.bossId`, `引用了不存在的敌人 "${String(rec.bossId)}"`);
    }
    out[key] = {
      id,
      name: assertL(rec.name, `${path}.name`),
      icon: assertString(rec.icon, `${path}.icon`),
      description: assertL(rec.description, `${path}.description`),
      difficulty: assertNumber(rec.difficulty, `${path}.difficulty`, { gte: 1 }),
      size: { w: sizeW, h: sizeH },
      enemyPool,
      itemPool: rec.itemPool.map((iid: unknown, i: number) =>
        assertItemId(iid, `${path}.itemPool[${i}]`, itemIds)
      ),
      bossId: assertString(rec.bossId, `${path}.bossId`),
    };
  }
  return out;
}

export function validateLoot(
  raw: unknown,
  items: Record<string, ItemDef>,
  enemies: Record<string, EnemyDef>
): Record<string, LootTable> {
  const root = assertRecord(raw, "loot.json");
  const itemIds = new Set(Object.keys(items));
  const enemyIds = new Set(Object.keys(enemies));
  const out: Record<string, LootTable> = {};
  for (const [key, value] of Object.entries(root)) {
    const path = `loot.json:${key}`;
    if (!enemyIds.has(key)) fail(path, `掉落表键 "${key}" 不是已定义的敌人`);
    const rec = assertRecord(value, path, ["items", "gold"]);
    if (!Array.isArray(rec.items)) fail(`${path}.items`, "应为数组");
    if (!Array.isArray(rec.gold) || rec.gold.length !== 2) {
      fail(`${path}.gold`, "应为 [min, max] 数组");
    }
    const goldMin = assertNumber(rec.gold[0], `${path}.gold[0]`, { gte: 0 });
    const goldMax = assertNumber(rec.gold[1], `${path}.gold[1]`, { gte: goldMin });
    out[key] = {
      items: rec.items.map((entry, i) => {
        const epath = `${path}.items[${i}]`;
        const erec = assertRecord(entry, epath, ["itemId", "chance"]);
        return {
          itemId: assertItemId(erec.itemId, `${epath}.itemId`, itemIds),
          chance: assertNumber(erec.chance, `${epath}.chance`, { gt: 0, lte: 1 }),
        };
      }),
      gold: [goldMin, goldMax],
    };
  }
  return out;
}
