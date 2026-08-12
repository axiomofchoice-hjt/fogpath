import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initBattle } from "../../state/battleEngine";
import { initialGameState, initialPlayer } from "../../state/init";
import type { GameState } from "../../types";

/** 村庄状态 + 自定义背包（保留默认装备槽） */
function withInventory(inventory: { itemId: string; quantity: number }[]): GameState {
  return {
    ...initialGameState(),
    screen: "game",
    player: { ...initialGameState().player, inventory },
  };
}

/** 打开背包 Tab 并返回点击入口 */
async function openInventory(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /背包 \(E\)/ }));
}

/** 条目行：按物品名定位（背包条目第一行名字，限定在条目容器内） */
function itemRow(name: string): HTMLElement {
  const rows = screen.getAllByTestId("inventory-row");
  const row = rows.find((r) => r.textContent?.includes(name));
  if (!row) throw new Error(`背包条目行未找到：${name}`);
  return row;
}

/** 侧栏内物品名按 DOM 序（仅取背包条目行，排除描述文本/装备面板内容） */
function itemNamesInOrder(): string[] {
  return screen
    .getAllByTestId("inventory-row")
    .map((row) => row.querySelector("[data-testid='inventory-item-name']")?.textContent ?? "");
}

describe("背包面板", () => {
  it("默认按类型排序：消耗品 < 货币 < 装备", async () => {
    const user = userEvent.setup();
    renderGame(
      withInventory([
        { itemId: "gold", quantity: 20 },
        { itemId: "iron_sword", quantity: 1 },
        { itemId: "health_potion", quantity: 2 },
      ])
    );
    await openInventory(user);
    // localeCompare 类型序：consumable < currency < equipment
    expect(itemNamesInOrder()).toEqual(["治疗药水", "金币", "铁剑"]);
  });

  it("切换「稀有」排序：稀有度高的装备排前", async () => {
    const user = userEvent.setup();
    renderGame(
      withInventory([
        { itemId: "gold", quantity: 20 },
        { itemId: "lucky_ring", quantity: 1 },
        { itemId: "iron_sword", quantity: 1 },
      ])
    );
    await openInventory(user);
    await user.click(screen.getByRole("button", { name: "稀有" }));
    // 幸运戒指 rarity 3 > 铁剑 2 > 金币 1
    expect(itemNamesInOrder()).toEqual(["幸运戒指", "铁剑", "金币"]);
  });

  it("装备：E 按钮移入装备栏（卸下按钮随之出现）", async () => {
    const user = userEvent.setup();
    renderGame(withInventory([{ itemId: "iron_sword", quantity: 1 }]));
    await openInventory(user);
    const row = itemRow("铁剑");
    const equipBtn = within(row).getByTitle("装备");
    await user.click(equipBtn);
    // 背包条目消失、左侧装备面板出现铁剑（E 按钮不可再点）
    expect(screen.queryByTitle("装备")).not.toBeInTheDocument();
    expect(screen.getAllByText(/铁剑/).length).toBeGreaterThan(0);
  });

  it("使用：U 按钮消耗物品数量", async () => {
    const user = userEvent.setup();
    renderGame(withInventory([{ itemId: "health_potion", quantity: 2 }]));
    await openInventory(user);
    const row = itemRow("治疗药水");
    await user.click(within(row).getByTitle("使用"));
    expect(within(row).getByText("x1")).toBeInTheDocument();
  });

  it("丢弃：✕ 按钮移除物品", async () => {
    const user = userEvent.setup();
    renderGame(withInventory([{ itemId: "health_potion", quantity: 1 }]));
    await openInventory(user);
    const row = itemRow("治疗药水");
    await user.click(within(row).getByTitle("丢弃"));
    expect(screen.queryByText("治疗药水")).not.toBeInTheDocument();
  });

  it("战斗中使用道具（USE_ITEM 走战斗路径）", async () => {
    const user = userEvent.setup();
    const state: GameState = {
      ...withInventory([{ itemId: "health_potion", quantity: 1 }]),
      battle: initBattle("test_atk_vs_atk", initialPlayer()),
    };
    renderGame(state);
    await openInventory(user);
    const row = itemRow("治疗药水");
    await user.click(within(row).getByTitle("使用"));
    // 战斗内道具在 resolveTurn 中消耗：背包条目消失、回合推进
    expect(screen.queryByText("治疗药水")).not.toBeInTheDocument();
    expect(screen.getAllByText(/回合 1/).length).toBeGreaterThan(0);
  });
});
