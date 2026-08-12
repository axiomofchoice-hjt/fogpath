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

  it("旧档缺 hasPet：可加载并补默认 false", () => {
    const s = villageState();
    const player = s.player as unknown as Record<string, unknown>;
    delete player.hasPet;
    const oldText = JSON.stringify({ version: SAVE_VERSION, savedAt: 1, state: s });
    expect(isGameState(s)).toBe(true);
    const loaded = deserializeSave(oldText);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.hasPet).toBe(false);
  });

  it("hasPet 非布尔值拒绝", () => {
    const s = { ...villageState(), player: { ...villageState().player, hasPet: "yes" } };
    expect(isGameState(s)).toBe(false);
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

  it("嵌套结构损坏拒绝（深度校验）", () => {
    const p = villageState().player;
    // 背包条目缺 quantity
    const badInventory = { ...villageState(), player: { ...p, inventory: [{ itemId: "gold" }] } };
    expect(isGameState(badInventory)).toBe(false);
    // 背包数量非正
    const negQty = { ...villageState(), player: { ...p, inventory: [{ itemId: "gold", quantity: -1 }] } };
    expect(isGameState(negQty)).toBe(false);
    // 装备格数不符
    const shortEquip = { ...villageState(), player: { ...p, equipment: ["rusty_sword"] } };
    expect(isGameState(shortEquip)).toBe(false);
    // 装备格含非字符串非 null
    const badEquip = { ...villageState(), player: { ...p, equipment: [42, null, null, null, null, null] } };
    expect(isGameState(badEquip)).toBe(false);
    // pickedItemIds 非字符串数组
    const badPicked = { ...villageState(), player: { ...p, pickedItemIds: [1] } };
    expect(isGameState(badPicked)).toBe(false);
  });

  it("地牢嵌套损坏拒绝（深度校验）", () => {
    const s = villageState();
    const dungeon = {
      dungeonId: "forest",
      size: { w: 3, h: 3 },
      rooms: [[{ type: "normal", explored: false, depth: 0, enemyIds: [] }]],
      playerPos: { x: 0, y: 0 },
    };
    expect(isGameState({ ...s, dungeon })).toBe(false); // 行数不齐不是关键——房间缺 itemIds 才是
    const badRoom = {
      ...dungeon,
      rooms: [[{ type: "normal", explored: false, depth: 0, enemyIds: [] }], [], []],
    };
    expect(isGameState({ ...s, dungeon: badRoom })).toBe(false);
    const badPos = { ...dungeon, rooms: [], playerPos: { x: "a", y: 0 } };
    expect(isGameState({ ...s, dungeon: badPos })).toBe(false);
  });

  it("战斗嵌套损坏拒绝（深度校验）", () => {
    const s = villageState();
    const battle = {
      scenarioId: "dungeon",
      turn: 1,
      playerStats: { hp: 10, maxHp: 100, mp: 5, maxMp: 100, damage: 0, maxDamage: 0, hasAttack: false },
      playerSummary: { zh: "a", en: "b" },
      playerActions: [{ skillId: "basic_attack", damage: 10 }],
      equipment: ["rusty_sword", null, null, null, null, null],
      guardReduction: 0.5,
      shieldActive: false,
      enemies: [
        {
          defId: "goblin",
          hp: 30,
          maxHp: 30,
          mp: 0,
          maxMp: 0,
          damage: 0,
          maxDamage: 8,
          hasAttack: false,
          isBoss: false,
          pattern: { patternId: "combo", stepIndex: 0 },
          lastPatternId: null,
          summary: { zh: "a", en: "b" },
        },
      ],
      log: [{ zh: "a", en: "b", kind: "info" }],
      result: "ongoing",
    };
    expect(isGameState({ ...s, battle })).toBe(true);
    expect(isGameState({ ...s, battle: { ...battle, playerActions: [{ skillId: "x" }] } })).toBe(false);
    expect(isGameState({ ...s, battle: { ...battle, enemies: [{ defId: "goblin" }] } })).toBe(false);
    expect(isGameState({ ...s, battle: { ...battle, log: [{ zh: "a", en: "b", kind: "bogus" }] } })).toBe(false);
    expect(isGameState({ ...s, battle: { ...battle, playerStats: { hp: 1 } } })).toBe(false);
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
