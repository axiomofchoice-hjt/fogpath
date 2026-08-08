import { beforeEach, describe, expect, it } from "vitest";
import type { GameState } from "../types";
import { gameReducer } from "./gameReducer";
import { initialGameState, initialPlayer } from "./init";
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  deserializeSave,
  isGameState,
  loadSave,
  loadSaveInfo,
  saveGame,
  serializeSave,
  shouldAutoSave,
} from "./save";

function villageState(): GameState {
  return {
    screen: "game",
    player: {
      ...initialPlayer(),
      hp: 73,
      mp: 41,
      inventory: [
        { itemId: "gold", quantity: 88 },
        { itemId: "health_potion", quantity: 3 },
      ],
    },
    battle: null,
    dungeon: null,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("saveGame / loadSave 往返", () => {
  it("保存后读取返回相同状态", () => {
    const s = villageState();
    saveGame(s);
    expect(loadSave()).toEqual(s);
  });

  it("覆盖写：后存者胜", () => {
    saveGame(villageState());
    const later = { ...villageState(), player: { ...villageState().player, hp: 10 } };
    saveGame(later);
    expect(loadSave()).toEqual(later);
  });

  it("无存档时 loadSave 返回 null", () => {
    expect(loadSave()).toBeNull();
  });

  it("clearSave 清除存档", () => {
    saveGame(villageState());
    clearSave();
    expect(loadSave()).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it("loadSaveInfo 返回时间戳与状态", () => {
    saveGame(villageState());
    const info = loadSaveInfo();
    expect(info?.state).toEqual(villageState());
    expect(info?.savedAt).toBeTypeOf("number");
  });
});

describe("损坏/非法存档", () => {
  it("损坏 JSON 返回 null", () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    expect(loadSave()).toBeNull();
  });

  it("版本不符返回 null", () => {
    const bad = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 1, state: villageState() });
    localStorage.setItem(SAVE_KEY, bad);
    expect(loadSave()).toBeNull();
  });

  it("结构非法（缺 player）返回 null", () => {
    const bad = JSON.stringify({ version: SAVE_VERSION, savedAt: 1, state: { screen: "game" } });
    localStorage.setItem(SAVE_KEY, bad);
    expect(loadSave()).toBeNull();
  });

  it("结构非法（battle 缺字段）返回 null", () => {
    const s = villageState();
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, savedAt: 1, state: { ...s, battle: {} } })
    );
    expect(loadSave()).toBeNull();
  });
});

describe("serializeSave / deserializeSave 导出导入", () => {
  it("导出后导入返回相同状态", () => {
    const s = villageState();
    const text = serializeSave(s);
    expect(deserializeSave(text)).toEqual(s);
  });

  it("文件包含版本号与时间戳", () => {
    const parsed = JSON.parse(serializeSave(villageState()));
    expect(parsed.version).toBe(SAVE_VERSION);
    expect(parsed.savedAt).toBeTypeOf("number");
  });

  it("非法文本返回 null", () => {
    expect(deserializeSave("garbage")).toBeNull();
    expect(deserializeSave("")).toBeNull();
  });
});

describe("isGameState 守卫", () => {
  it("合法状态通过", () => {
    expect(isGameState(villageState())).toBe(true);
    expect(isGameState(initialGameState())).toBe(true);
  });

  it("非法输入拒绝", () => {
    expect(isGameState(null)).toBe(false);
    expect(isGameState(undefined)).toBe(false);
    expect(isGameState("abc")).toBe(false);
    expect(isGameState({ screen: "game" })).toBe(false);
    expect(isGameState({ ...villageState(), screen: "battle" })).toBe(false);
    const p = villageState().player;
    expect(isGameState({ ...villageState(), player: { ...p, hp: "x" } })).toBe(false);
  });
});

describe("shouldAutoSave 自动存档条件", () => {
  it("村庄安全屋内返回 true", () => {
    const s = villageState();
    expect(shouldAutoSave(s)).toBe(true);
    expect(shouldAutoSave({ ...s, player: { ...s.player, currentRoomId: "village_shop" } })).toBe(true);
  });

  it("开始面板返回 false", () => {
    expect(shouldAutoSave(initialGameState())).toBe(false);
  });

  it("战斗/地牢中返回 false", () => {
    const s = villageState();
    expect(shouldAutoSave({ ...s, battle: {} as GameState["battle"] })).toBe(false);
    expect(
      shouldAutoSave({ ...s, dungeon: { dungeonId: "forest", size: { w: 5, h: 5 }, rooms: [], playerPos: { x: 0, y: 0 } } })
    ).toBe(false);
  });

  it("非安全屋返回 false", () => {
    const s = { ...villageState(), player: { ...villageState().player, currentRoomId: "nowhere" } };
    expect(shouldAutoSave(s)).toBe(false);
  });
});

describe("LOAD_SAVE 载入存档", () => {
  it("替换整个状态", () => {
    const s = villageState();
    const loaded = gameReducer(initialGameState(), { type: "LOAD_SAVE", save: s });
    expect(loaded).toEqual(s);
  });
});
