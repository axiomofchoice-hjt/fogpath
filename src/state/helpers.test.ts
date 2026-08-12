import { describe, expect, it } from "vitest";
import type { DungeonRoom, InventoryEntry } from "../types";
import {
  addToInventory,
  canRemoveFromInventory,
  patchRoom,
  removeFromInventory,
} from "./helpers";

const inv = (): InventoryEntry[] => [
  { itemId: "gold", quantity: 20 },
  { itemId: "health_potion", quantity: 2 },
];

describe("canRemoveFromInventory（可以执行检查）", () => {
  it("数量足够返回 true", () => {
    expect(canRemoveFromInventory(inv(), "gold", 20)).toBe(true);
    expect(canRemoveFromInventory(inv(), "health_potion", 1)).toBe(true);
  });

  it("数量不足 / 条目缺失 / qty 非正返回 false", () => {
    expect(canRemoveFromInventory(inv(), "gold", 21)).toBe(false);
    expect(canRemoveFromInventory(inv(), "mana_potion", 1)).toBe(false);
    expect(canRemoveFromInventory(inv(), "gold", 0)).toBe(false);
    expect(canRemoveFromInventory(inv(), "gold", -1)).toBe(false);
  });
});

describe("removeFromInventory（执行：无法履约必须断言失败，不静默）", () => {
  it("部分扣除数量，其他条目不变", () => {
    const next = removeFromInventory(inv(), "gold", 5);
    expect(next).toEqual([
      { itemId: "gold", quantity: 15 },
      { itemId: "health_potion", quantity: 2 },
    ]);
  });

  it("数量恰好等于 qty 时移除条目", () => {
    const next = removeFromInventory(inv(), "health_potion", 2);
    expect(next).toEqual([{ itemId: "gold", quantity: 20 }]);
  });

  it("条目不存在：断言失败（调用方漏了 canRemoveFromInventory 守卫）", () => {
    expect(() => removeFromInventory(inv(), "mana_potion", 1)).toThrow(/removeFromInventory/);
  });

  it("数量不足：断言失败（调用方漏了 canRemoveFromInventory 守卫）", () => {
    expect(() => removeFromInventory(inv(), "gold", 99)).toThrow(/removeFromInventory/);
  });

  it("qty 非正：断言失败", () => {
    expect(() => removeFromInventory(inv(), "gold", 0)).toThrow(/removeFromInventory/);
  });
});

describe("addToInventory（执行：qty 非正断言失败，不静默）", () => {
  it("新增条目与合并数量", () => {
    expect(addToInventory(inv(), "herb_bundle", 1)).toEqual([
      { itemId: "gold", quantity: 20 },
      { itemId: "health_potion", quantity: 2 },
      { itemId: "herb_bundle", quantity: 1 },
    ]);
    expect(addToInventory(inv(), "gold", 5)).toEqual([
      { itemId: "gold", quantity: 25 },
      { itemId: "health_potion", quantity: 2 },
    ]);
  });

  it("qty 非正：断言失败", () => {
    expect(() => addToInventory(inv(), "gold", 0)).toThrow(/addToInventory/);
  });
});

describe("patchRoom（不可变更新单格）", () => {
  const room = (): DungeonRoom => ({
    type: "normal",
    explored: false,
    depth: 0,
    enemyIds: [],
    itemIds: [],
  });
  const dungeon = {
    dungeonId: "forest",
    size: { w: 3, h: 3 },
    rooms: [
      [room(), null, room()],
      [null, room(), null],
      [room(), room(), room()],
    ],
    playerPos: { x: 0, y: 0 },
  };

  it("更新目标格，其余格原样保留（引用不变）", () => {
    const next = patchRoom(dungeon, 1, 1, { explored: true });
    expect(next[1][1]!.explored).toBe(true);
    expect(next[0][0]).toBe(dungeon.rooms[0][0]);
    expect(next[0][1]).toBeNull();
  });

  it("目标格为墙（null）：断言失败（调用方 bug 不得静默）", () => {
    expect(() => patchRoom(dungeon, 0, 1, { explored: true })).toThrow(/patchRoom/);
  });
});
