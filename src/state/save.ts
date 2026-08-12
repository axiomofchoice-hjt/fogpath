import type {
  BattleEnemy,
  BattleState,
  CombatStats,
  DungeonRoom,
  DungeonState,
  GameState,
  InventoryEntry,
  ItemAction,
  L,
  LogEntry,
} from "../types";
import { EQUIP_SLOT_COUNT } from "../types";
import { rooms as roomMap } from "../data/config";

/** 存档版本：结构变更时递增，旧版存档拒绝加载 */
export const SAVE_VERSION = 1;

export const SAVE_KEY = "fogpath.save";

export interface SaveFile {
  version: number;
  savedAt: number;
  state: GameState;
}

// --- 深度校验：防损坏数据进入 reducer（浅校验会让坏档在深层崩溃，此处逐字段拦截） ---

function isL(x: unknown): x is L {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as L).zh === "string" &&
    typeof (x as L).en === "string"
  );
}

function isStrArr(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((e) => typeof e === "string");
}

function isInventory(x: unknown): x is InventoryEntry[] {
  return (
    Array.isArray(x) &&
    x.every(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as InventoryEntry).itemId === "string" &&
        Number.isInteger((e as InventoryEntry).quantity) &&
        (e as InventoryEntry).quantity > 0
    )
  );
}

function isEquipment(x: unknown): x is (string | null)[] {
  return (
    Array.isArray(x) &&
    x.length === EQUIP_SLOT_COUNT &&
    x.every((e) => e === null || typeof e === "string")
  );
}

function isCombatStats(x: unknown): x is CombatStats {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.hp === "number" &&
    typeof s.maxHp === "number" &&
    typeof s.mp === "number" &&
    typeof s.maxMp === "number" &&
    typeof s.damage === "number" &&
    typeof s.maxDamage === "number" &&
    typeof s.hasAttack === "boolean"
  );
}

function isBattleEnemy(x: unknown): x is BattleEnemy {
  if (typeof x !== "object" || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.defId === "string" &&
    typeof e.hp === "number" &&
    typeof e.maxHp === "number" &&
    typeof e.mp === "number" &&
    typeof e.maxMp === "number" &&
    typeof e.damage === "number" &&
    typeof e.maxDamage === "number" &&
    typeof e.hasAttack === "boolean" &&
    typeof e.isBoss === "boolean" &&
    typeof e.pattern === "object" &&
    e.pattern !== null &&
    typeof (e.pattern as Record<string, unknown>).patternId === "string" &&
    typeof (e.pattern as Record<string, unknown>).stepIndex === "number" &&
    (e.lastPatternId === null || typeof e.lastPatternId === "string") &&
    isL(e.summary)
  );
}

function isBattle(x: unknown): x is BattleState {
  if (typeof x !== "object" || x === null) return false;
  const b = x as Record<string, unknown>;
  if (typeof b.scenarioId !== "string" || typeof b.turn !== "number") return false;
  if (!isCombatStats(b.playerStats)) return false;
  if (!isL(b.playerSummary)) return false;
  if (
    !Array.isArray(b.playerActions) ||
    !b.playerActions.every((a) => {
      if (typeof a !== "object" || a === null) return false;
      const act = a as ItemAction;
      return typeof act.skillId === "string" && typeof act.damage === "number";
    })
  ) {
    return false;
  }
  if (!isEquipment(b.equipment)) return false;
  if (typeof b.guardReduction !== "number" || typeof b.shieldActive !== "boolean") return false;
  if (!Array.isArray(b.enemies) || !b.enemies.every(isBattleEnemy)) return false;
  if (
    !Array.isArray(b.log) ||
    !b.log.every((l) => {
      if (!isL(l)) return false;
      const kind = (l as LogEntry).kind;
      return kind === "turn" || kind === "victory" || kind === "defeat" || kind === "info";
    })
  ) {
    return false;
  }
  return b.result === "ongoing" || b.result === "victory" || b.result === "defeat";
}

function isDungeonRoom(x: unknown): x is DungeonRoom {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    (r.type === "entrance" || r.type === "normal" || r.type === "boss") &&
    typeof r.explored === "boolean" &&
    typeof r.depth === "number" &&
    isStrArr(r.enemyIds) &&
    isStrArr(r.itemIds) &&
    (r.roomKey === undefined || typeof r.roomKey === "string")
  );
}

function isDungeon(x: unknown): x is DungeonState {
  if (typeof x !== "object" || x === null) return false;
  const d = x as Record<string, unknown>;
  if (typeof d.dungeonId !== "string") return false;
  const size = d.size;
  if (typeof size !== "object" || size === null) return false;
  const sz = size as Record<string, unknown>;
  if (typeof sz.w !== "number" || typeof sz.h !== "number") return false;
  if (
    !Array.isArray(d.rooms) ||
    !d.rooms.every(
      (row) => Array.isArray(row) && row.every((c) => c === null || isDungeonRoom(c))
    )
  ) {
    return false;
  }
  const pos = d.playerPos;
  if (typeof pos !== "object" || pos === null) return false;
  const p = pos as Record<string, unknown>;
  return typeof p.x === "number" && typeof p.y === "number";
}

/** 深度结构守卫：存档解出后逐字段校验，防损坏数据进入 reducer */
export function isGameState(x: unknown): x is GameState {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  if (s.screen !== "start" && s.screen !== "game") return false;
  const p = s.player;
  if (typeof p !== "object" || p === null) return false;
  const player = p as Record<string, unknown>;
  if (typeof player.hp !== "number" || typeof player.maxHp !== "number") return false;
  if (typeof player.mp !== "number" || typeof player.maxMp !== "number") return false;
  if (typeof player.currentRoomId !== "string") return false;
  if (!isInventory(player.inventory)) return false;
  if (!isEquipment(player.equipment)) return false;
  if (!isStrArr(player.pickedItemIds)) return false;
  // hasPet 允许缺失（旧档补默认 false），存在则必须为布尔
  if (player.hasPet !== undefined && typeof player.hasPet !== "boolean") return false;
  if (s.battle !== null) {
    if (s.battle === undefined || !isBattle(s.battle)) return false;
  }
  if (s.dungeon !== null) {
    if (s.dungeon === undefined || !isDungeon(s.dungeon)) return false;
  }
  return true;
}

function isSaveFile(x: unknown): x is SaveFile {
  if (typeof x !== "object" || x === null) return false;
  const f = x as Record<string, unknown>;
  return f.version === SAVE_VERSION && typeof f.savedAt === "number" && isGameState(f.state);
}

/** 序列化存档（导出/写入共用） */
export function serializeSave(state: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), state };
  return JSON.stringify(file);
}

/** 反序列化存档（导入/读取共用）；非法返回 null；旧档缺失新字段时补默认值 */
export function deserializeSave(text: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isSaveFile(parsed)) return null;
    const state = parsed.state;
    if (state.player.hasPet === undefined) state.player.hasPet = false;
    return state;
  } catch {
    return null;
  }
}

/** 写入本地存档槽（单槽位，覆盖） */
export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(state));
  } catch {
    // 存储不可用（隐私模式/配额）：静默失败，不影响游戏
  }
}

/** 读取本地存档；无存档或非法返回 null */
export function loadSave(): GameState | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (!text) return null;
    return deserializeSave(text);
  } catch {
    return null;
  }
}

/** 读取存档元信息（开始面板展示用）；无存档返回 null */
export function loadSaveInfo(): { savedAt: number; state: GameState } | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (!text) return null;
    const parsed: unknown = JSON.parse(text);
    if (!isSaveFile(parsed)) return null;
    return { savedAt: parsed.savedAt, state: parsed.state };
  } catch {
    return null;
  }
}

/** 清除本地存档 */
export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // 同上：静默失败
  }
}

/** 自动存档条件：村庄安全屋内（非战斗、非地牢、当前房间为安全屋） */
export function shouldAutoSave(state: GameState): boolean {
  if (state.screen !== "game") return false;
  if (state.battle || state.dungeon) return false;
  return roomMap[state.player.currentRoomId]?.isSafeRoom ?? false;
}
