import type { GameState } from "../types";
import { rooms as roomMap } from "../data/config";

/** 存档版本：结构变更时递增，旧版存档拒绝加载 */
export const SAVE_VERSION = 1;

export const SAVE_KEY = "fogpath.save";

export interface SaveFile {
  version: number;
  savedAt: number;
  state: GameState;
}

/** 最小结构守卫：存档解出后逐字段校验，防损坏数据进入 reducer */
export function isGameState(x: unknown): x is GameState {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  if (s.screen !== "start" && s.screen !== "game") return false;
  if (typeof s.player !== "object" || s.player === null) return false;
  const p = s.player as Record<string, unknown>;
  if (typeof p.hp !== "number" || typeof p.maxHp !== "number") return false;
  if (typeof p.mp !== "number" || typeof p.maxMp !== "number") return false;
  if (typeof p.currentRoomId !== "string") return false;
  if (!Array.isArray(p.inventory) || !Array.isArray(p.equipment)) return false;
  if (!Array.isArray(p.pickedItemIds)) return false;
  if (p.hasPet !== undefined && typeof p.hasPet !== "boolean") return false;
  if (s.battle !== null) {
    if (typeof s.battle !== "object" || s.battle === undefined) return false;
    const b = s.battle as Record<string, unknown>;
    if (typeof b.scenarioId !== "string" || typeof b.turn !== "number") return false;
    if (b.result !== "ongoing" && b.result !== "victory" && b.result !== "defeat") return false;
    if (typeof b.playerStats !== "object" || b.playerStats === null) return false;
    if (!Array.isArray(b.enemies)) return false;
  }
  if (s.dungeon !== null) {
    if (typeof s.dungeon !== "object" || s.dungeon === undefined) return false;
    const d = s.dungeon as Record<string, unknown>;
    if (typeof d.dungeonId !== "string") return false;
    if (typeof d.size !== "object" || d.size === null) return false;
    const size = d.size as Record<string, unknown>;
    if (typeof size.w !== "number" || typeof size.h !== "number") return false;
    if (!Array.isArray(d.rooms)) return false;
    if (typeof d.playerPos !== "object" || d.playerPos === null) return false;
    const pos = d.playerPos as Record<string, unknown>;
    if (typeof pos.x !== "number" || typeof pos.y !== "number") return false;
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
