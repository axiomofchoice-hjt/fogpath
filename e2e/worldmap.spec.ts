import { test, expect } from "@playwright/test";

/**
 * 展开大地图：当前房间居中（玩家所在格位于视口中心），
 * 格子尺寸保持 48×48（展开地图不得改变地图大小）。
 */

async function enterCampDungeon(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await page.keyboard.press("w");
  await page.getByRole("button", { name: "进入地牢" }).click();
}

test("展开地图：当前房间格位于视口中心，格子 48×48", async ({ page }) => {
  await enterCampDungeon(page);
  await page.getByRole("button", { name: "展开地图" }).click();
  const canvas = page.getByTestId("world-map-canvas");
  await expect(canvas).toBeVisible();
  const viewport = page.viewportSize()!;
  // 玩家所在格（标题格为已探索的入口房 r1）
  const cell = canvas.locator("div[title]").first();
  const rect = (await cell.boundingBox())!;
  expect(rect.width).toBe(48);
  expect(rect.height).toBe(48);
  expect(rect.x + rect.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(rect.y + rect.height / 2).toBeCloseTo(viewport.height / 2, 0);
});

test("村庄展开地图：当前房间居中，方块与地牢一致 48×48", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await page.getByRole("button", { name: "展开地图" }).click();
  const overlay = page.locator("div.fixed.inset-0");
  await expect(overlay.first()).toBeVisible();
  const viewport = page.viewportSize()!;
  const current = overlay.locator("div[title='村庄广场']");
  await expect(current).toBeVisible();
  const rect = (await current.boundingBox())!;
  expect(rect.width).toBe(48);
  expect(rect.height).toBe(48);
  expect(rect.x + rect.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(rect.y + rect.height / 2).toBeCloseTo(viewport.height / 2, 0);
});
