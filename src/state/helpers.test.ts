import { describe, expect, it } from "vitest";
import type { InventoryEntry } from "../types";
import { removeFromInventory } from "./helpers";

const inv = (): InventoryEntry[] => [
  { itemId: "gold", quantity: 20 },
  { itemId: "health_potion", quantity: 2 },
];

describe("removeFromInventory（助手契约：无法履约必须断言失败）", () => {
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

  it("条目不存在：断言失败（调用方漏了存在性检查）", () => {
    expect(() => removeFromInventory(inv(), "mana_potion", 1)).toThrow(/removeFromInventory/);
  });

  it("数量不足：断言失败（调用方漏了资源守卫）", () => {
    expect(() => removeFromInventory(inv(), "gold", 99)).toThrow(/removeFromInventory/);
  });
});
