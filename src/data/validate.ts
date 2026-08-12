import type { DungeonDef, DungeonRoomSpec, EnemyDef, ItemDef, LootTable, RoomDef, SkillDef } from "../types";

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
      "hpRestore", "mpRestore", "isShield", "actions",
    ]);
    const id = assertString(rec.id, `${path}.id`);
    assertKeyMatch(key, id, path);
    const type = assertString(rec.type, `${path}.type`);
    if (type !== "equipment" && type !== "consumable" && type !== "currency" && type !== "pet") {
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
        const arec = assertRecord(a, apath, ["skillId", "damage"]);
        return {
          skillId: assertSkillId(arec.skillId, `${apath}.skillId`, skillIds),
          damage: assertNumber(arec.damage, `${apath}.damage`, { gt: 0 }),
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
      "id", "name", "icon", "maxHp", "maxMp", "damage", "isBoss", "moves", "patterns",
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
          const srec = assertRecord(s, spath, ["kind", "name", "damage"]);
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
            };
          }
          fail(spath, `未知步骤类型 "${kind}"`);
        }),
      };
    });
    // 动作集：名称必须与模式步中的攻击名一致（玩家可见信息不能超出实际行为）
    const attackNames = new Set(
      patterns.flatMap((p) => p.steps.flatMap((s) => (s.kind === "attack" ? [s.name.zh] : [])))
    );
    let moves: EnemyDef["moves"];
    if (rec.moves !== undefined) {
      if (!Array.isArray(rec.moves) || rec.moves.length === 0) {
        fail(`${path}.moves`, "应为非空数组");
      }
      moves = rec.moves.map((m, mi) => {
        const mpath = `${path}.moves[${mi}]`;
        const mrec = assertRecord(m, mpath, ["name", "charge"]);
        const name = assertL(mrec.name, `${mpath}.name`);
        if (!attackNames.has(name.zh)) {
          fail(`${mpath}.name`, `动作 "${name.zh}" 不在任何模式步的攻击名中`);
        }
        return {
          name,
          charge: assertNumber(mrec.charge, `${mpath}.charge`, { gte: 0 }),
        };
      });
    }
    out[key] = {
      id,
      name: assertL(rec.name, `${path}.name`),
      icon: assertString(rec.icon, `${path}.icon`),
      maxHp: assertNumber(rec.maxHp, `${path}.maxHp`, { gt: 0 }),
      maxMp: assertNumber(rec.maxMp, `${path}.maxMp`, { gte: 0 }),
      damage: assertNumber(rec.damage, `${path}.damage`, { gte: 0 }),
      ...(rec.isBoss !== undefined ? { isBoss: assertBoolean(rec.isBoss, `${path}.isBoss`) } : {}),
      ...(moves ? { moves } : {}),
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
      "id", "name", "description", "area", "isSafeRoom", "itemIds", "exits", "pos", "npc", "shopItems", "dungeonId",
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
      ...(rec.dungeonId !== undefined ? { dungeonId: assertString(rec.dungeonId, `${path}.dungeonId`) } : {}),
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
      "id", "name", "icon", "description", "difficulty", "size", "roomCount",
      "enemyPool", "itemPool", "bossId", "layout", "rooms", "guide",
    ]);
    const id = assertString(rec.id, `${path}.id`);
    assertKeyMatch(key, id, path);
    const bossId = assertString(rec.bossId, `${path}.bossId`);
    if (!enemyIds.has(bossId)) fail(`${path}.bossId`, `引用了不存在的敌人 "${bossId}"`);

    // 静态布局模式：layout + rooms；随机生成模式：size/roomCount/enemyPool/itemPool
    const hasLayout = rec.layout !== undefined;
    if (hasLayout) {
      if (rec.rooms === undefined) fail(`${path}.rooms`, "layout 模式必须提供 rooms");
      if (rec.size !== undefined) fail(`${path}.size`, "layout 模式不允许 size（由网格推导）");
      if (rec.roomCount !== undefined) fail(`${path}.roomCount`, "layout 模式不允许 roomCount");
      if (rec.enemyPool !== undefined) fail(`${path}.enemyPool`, "layout 模式不允许 enemyPool");
      if (rec.itemPool !== undefined) fail(`${path}.itemPool`, "layout 模式不允许 itemPool");
    } else {
      for (const field of ["size", "roomCount", "enemyPool", "itemPool"] as const) {
        if (rec[field] === undefined) fail(`${path}.${field}`, `随机生成模式必须提供 ${field}`);
      }
    }

    const layout = hasLayout ? parseLayout(rec.layout, path) : undefined;
    const roomSpecs = hasLayout
      ? parseRoomSpecs(rec.rooms, `${path}.rooms`, enemyIds, itemIds)
      : undefined;
    if (layout && roomSpecs) {
      validateStaticDungeon(layout, roomSpecs, bossId, `${path}.layout`);
      if (rec.guide !== undefined) {
        validateGuide(rec.guide, layout, `${path}.guide`);
      }
    }

    const sizeRec = rec.size === undefined ? undefined : assertRecord(rec.size, `${path}.size`, ["w", "h"]);
    const sizeW = sizeRec === undefined ? undefined : assertNumber(sizeRec.w, `${path}.size.w`, { gt: 0 });
    const sizeH = sizeRec === undefined ? undefined : assertNumber(sizeRec.h, `${path}.size.h`, { gt: 0 });
    const roomCount = rec.roomCount === undefined ? undefined : assertNumber(rec.roomCount, `${path}.roomCount`, {
      gte: 4,
      lte: (sizeW ?? 0) * (sizeH ?? 0),
    });
    if (roomCount !== undefined && !Number.isInteger(roomCount)) fail(`${path}.roomCount`, "应为整数");
    let enemyPool: DungeonDef["enemyPool"];
    if (rec.enemyPool !== undefined) {
      if (!Array.isArray(rec.enemyPool) || rec.enemyPool.length === 0) {
        fail(`${path}.enemyPool`, "应为非空数组");
      }
      enemyPool = rec.enemyPool.map((e, i) => {
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
    }
    let itemPool: string[] | undefined;
    if (rec.itemPool !== undefined) {
      if (!Array.isArray(rec.itemPool)) fail(`${path}.itemPool`, "应为数组");
      itemPool = rec.itemPool.map((iid: unknown, i: number) =>
        assertItemId(iid, `${path}.itemPool[${i}]`, itemIds)
      );
    }
    out[key] = {
      id,
      name: assertL(rec.name, `${path}.name`),
      icon: assertString(rec.icon, `${path}.icon`),
      description: assertL(rec.description, `${path}.description`),
      difficulty: assertNumber(rec.difficulty, `${path}.difficulty`, { gte: 1 }),
      ...(layout ? { layout } : {}),
      ...(roomSpecs ? { rooms: roomSpecs } : {}),
      ...(rec.guide !== undefined
        ? {
            guide: {
              icon: assertString((rec.guide as AnyRecord).icon, `${path}.guide.icon`),
              name: assertL((rec.guide as AnyRecord).name, `${path}.guide.name`),
              roomHints: assertLMap((rec.guide as AnyRecord).roomHints, `${path}.guide.roomHints`),
              battleHints: assertLMap((rec.guide as AnyRecord).battleHints, `${path}.guide.battleHints`),
            },
          }
        : {}),
      ...(sizeW !== undefined && sizeH !== undefined ? { size: { w: sizeW, h: sizeH } } : {}),
      ...(roomCount !== undefined ? { roomCount } : {}),
      ...(enemyPool ? { enemyPool } : {}),
      ...(itemPool ? { itemPool } : {}),
      bossId,
    };
  }
  return out;
}

/** 解析 layout 网格：字符串二维数组，单元格为空串或房间键 */
function parseLayout(raw: unknown, path: string): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(`${path}.layout`, "应为非空二维数组");
  }
  const width = (raw[0] as unknown[]).length;
  return raw.map((row, ri) => {
    const rpath = `${path}.layout[${ri}]`;
    if (!Array.isArray(row) || row.length === 0) fail(rpath, "应为非空数组");
    if (row.length !== width) fail(rpath, `行宽不一致（应为 ${width}）`);
    return row.map((cell, ci) => {
      if (cell === "") return "";
      return assertString(cell, `${rpath}[${ci}]`);
    });
  });
}

/** 解析布局房间定义 */
function parseRoomSpecs(
  raw: unknown,
  path: string,
  enemyIds: Set<string>,
  itemIds: Set<string>
): Record<string, DungeonRoomSpec> {
  const root = assertRecord(raw, path);
  const out: Record<string, DungeonRoomSpec> = {};
  for (const [rkey, value] of Object.entries(root)) {
    const rpath = `${path}.${rkey}`;
    const rec = assertRecord(value, rpath, ["type", "enemyIds", "itemIds"]);
    const type = assertString(rec.type, `${rpath}.type`);
    if (type !== "entrance" && type !== "normal" && type !== "boss") {
      fail(`${rpath}.type`, `未知房间类型 "${type}"`);
    }
    if (!Array.isArray(rec.enemyIds)) fail(`${rpath}.enemyIds`, "应为数组");
    if (!Array.isArray(rec.itemIds)) fail(`${rpath}.itemIds`, "应为数组");
    out[rkey] = {
      type,
      enemyIds: rec.enemyIds.map((eid: unknown, i: number) =>
        assertItemId(eid, `${rpath}.enemyIds[${i}]`, enemyIds)
      ),
      itemIds: rec.itemIds.map((iid: unknown, i: number) =>
        assertItemId(iid, `${rpath}.itemIds[${i}]`, itemIds)
      ),
    };
  }
  return out;
}

/** 静态布局整体校验：单元格引用合法、唯一入口/Boss、全连通、Boss 房含 bossId */
function validateStaticDungeon(
  layout: string[][],
  rooms: Record<string, DungeonRoomSpec>,
  bossId: string,
  path: string
): void {
  const height = layout.length;
  const width = layout[0].length;
  const cells: { key: string; x: number; y: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = layout[y][x];
      if (!cell) continue;
      if (!rooms[cell]) fail(`${path}[${y}][${x}]`, `引用了不存在的房间定义 "${cell}"`);
      cells.push({ key: cell, x, y });
    }
  }
  if (cells.length === 0) fail(path, "布局中没有任何房间");
  const entrances = cells.filter((c) => rooms[c.key].type === "entrance");
  const bossRooms = cells.filter((c) => rooms[c.key].type === "boss");
  if (entrances.length !== 1) fail(path, `必须且只能有一个入口房（现有 ${entrances.length}）`);
  if (bossRooms.length !== 1) fail(path, `必须且只能有一个 Boss 房（现有 ${bossRooms.length}）`);
  const bossCell = bossRooms[0];
  if (!rooms[bossCell.key].enemyIds.includes(bossId)) {
    fail(`${path}.rooms.${bossCell.key}.enemyIds`, `Boss 房必须包含 bossId "${bossId}"`);
  }
  // 全连通：从入口 BFS 必须到达所有房间（孤立/断片布局拒绝）
  const seen = new Set<string>([`${entrances[0].x},${entrances[0].y}`]);
  const queue: { x: number; y: number }[] = [{ x: entrances[0].x, y: entrances[0].y }];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (!layout[ny][nx] || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push({ x: nx, y: ny });
    }
  }
  if (seen.size !== cells.length) {
    fail(path, `布局不连通（${cells.length - seen.size} 个房间不可达）`);
  }
}

/** 引导提示：键必须指向布局中的房间，值为双语文本 */
function validateGuide(raw: unknown, layout: string[][], path: string): void {
  const rec = assertRecord(raw, path, ["icon", "name", "roomHints", "battleHints"]);
  const keys = new Set(layout.flat());
  keys.delete("");
  for (const field of ["roomHints", "battleHints"] as const) {
    const hints = assertRecord(rec[field], `${path}.${field}`);
    for (const [rkey, value] of Object.entries(hints)) {
      if (!keys.has(rkey)) fail(`${path}.${field}.${rkey}`, `引用了不在布局中的房间 "${rkey}"`);
      assertL(value, `${path}.${field}.${rkey}`);
    }
  }
}

function assertLMap(v: unknown, path: string): Record<string, { zh: string; en: string }> {
  const rec = assertRecord(v, path);
  const out: Record<string, { zh: string; en: string }> = {};
  for (const [k, value] of Object.entries(rec)) {
    out[k] = assertL(value, `${path}.${k}`);
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
