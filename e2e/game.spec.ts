import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

/**
 * 地牢种子：固定 Math.random=0.5 使地牢生成确定化——
 * 入口南侧 (7,8) 为未探索的哥布林壮汉房，按一次 s 即触发情报面板。
 * 战斗中敌人模式选取同样确定（press 模式：12/7 普通攻击）。
 */

async function enterSeededDungeon(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    Math.random = () => 0.5;
  });
  await page.getByRole("button", { name: "进入村庄" }).click();
  await page.keyboard.press("w");
  await page.getByRole("button", { name: "进入森林地牢" }).click();
}

test("村庄导航与商店", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();

  // WASD 节点导航：北→森林入口，南回广场，东→商店
  await page.keyboard.press("w");
  await expect(page.getByRole("heading", { name: "森林入口" })).toBeVisible();
  await page.keyboard.press("s");
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();
  await page.keyboard.press("d");
  await expect(page.getByRole("heading", { name: "村庄商店" })).toBeVisible();

  // 商店购买：金币 20 → 15
  await expect(page.getByText("金币 20")).toBeVisible();
  await page.getByRole("button", { name: "购买" }).first().click();
  await expect(page.getByText("金币 15")).toBeVisible();
});

test("测试战斗：动作按钮与回合推进", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /攻击 vs 攻击/ }).click();
  await expect(page.getByRole("heading", { name: "战斗" })).toBeVisible();

  await page.getByRole("button", { name: /普通攻击/ }).click();
  await expect(page.getByText("回合 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /休息/ }).click();
  await expect(page.getByText("回合 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /防御/ }).click();
  await expect(page.getByText("回合 3", { exact: true })).toBeVisible();
});

test("地牢：情报面板与撤离", async ({ page }) => {
  await enterSeededDungeon(page);
  await expect(page.getByRole("heading", { name: /森林 · 入口/ })).toBeVisible();
  await expect(page.getByText("地牢地图")).toBeVisible();
  // 地牢中顶栏「← 开始面板」隐藏（GDD 4.4 村庄专属）
  await expect(page.getByRole("button", { name: "← 开始面板" })).toHaveCount(0);

  // 向南进入未探索的敌人房 → 情报面板
  await page.keyboard.press("s");
  await expect(page.getByText("房间情报")).toBeVisible();
  await expect(page.getByText("哥布林壮汉")).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByText("房间情报")).toHaveCount(0);

  // X 撤离：地牢废弃回村庄入口
  await page.keyboard.press("x");
  await expect(page.getByRole("heading", { name: "森林入口" })).toBeVisible();
  await expect(page.getByRole("button", { name: "进入森林地牢" })).toBeVisible();
  await expect(page.getByRole("button", { name: "← 开始面板" })).toBeVisible();
});

test("地牢：进房即战与回合推进", async ({ page }) => {
  await enterSeededDungeon(page);
  await page.keyboard.press("s");
  await expect(page.getByText("房间情报")).toBeVisible();
  await page.getByRole("button", { name: "进入", exact: true }).click();

  await expect(page.getByRole("heading", { name: "战斗" })).toBeVisible();
  await expect(page.getByText("回合 0", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /普通攻击/ }).click();
  await expect(page.getByText("回合 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /休息/ }).click();
  await expect(page.getByText("回合 2", { exact: true })).toBeVisible();
});

test("存档：自动存档与刷新后续玩", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();

  // 商店购买改动状态 → 自动存档生效
  await page.keyboard.press("d");
  await page.getByRole("button", { name: "购买" }).first().click();
  await expect(page.getByText("金币 15")).toBeVisible();

  // 刷新：localStorage 保留，开始面板出现「继续冒险」与存档卡片
  await page.reload();
  await expect(page.getByText("上次存档")).toBeVisible();
  await page.getByRole("button", { name: "继续冒险" }).click();

  // 恢复至村庄商店，购买状态延续
  await expect(page.getByRole("heading", { name: "村庄商店" })).toBeVisible();
  await expect(page.getByText("金币 15")).toBeVisible();
});

test("存档：进入村庄后返回开始面板，存档保留可继续", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();

  // 未做任何改动直接返回开始面板：状态虽与初始态相同，但存档必须视为存在
  await page.getByRole("button", { name: "← 开始面板" }).click();
  await expect(page.getByRole("button", { name: "继续冒险" })).toBeVisible();
  await expect(page.getByRole("button", { name: "进入村庄" })).toHaveCount(0);

  // 可再次继续冒险回到村庄
  await page.getByRole("button", { name: "继续冒险" }).click();
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();
});

test("存档：重新开始清档后按钮复位，可正常新游戏", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();
  await page.reload();

  // 有存档：面板显示「继续冒险」
  await expect(page.getByRole("button", { name: "继续冒险" })).toBeVisible();

  // 重新开始（确认对话框接受）→ 存档清空，「继续冒险」必须消失，按钮复位为「进入村庄」
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "重新开始（清空进度）" }).click();
  await expect(page.getByRole("button", { name: "继续冒险" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "进入村庄" })).toBeVisible();

  // 新游戏可正常进入
  await page.getByRole("button", { name: "进入村庄" }).click();
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();

  // 刷新后：新游戏已自动存档，可正常继续
  await page.reload();
  await expect(page.getByRole("button", { name: "继续冒险" })).toBeVisible();
});

test("存档：手动保存与导出导入", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();

  // 手动保存按钮 + 反馈
  await page.getByRole("button", { name: "保存进度" }).click();
  await expect(page.getByText(/已存档/)).toBeVisible();

  // 导出存档文件
  const downloadPromise = page.waitForEvent("download");
  await page.goto("/");
  await page.getByRole("button", { name: "导出存档" }).click();
  const download = await downloadPromise;
  const buffer = readFileSync(await download.path());

  // 清空本地存档 → 回到「进入村庄」
  await page.evaluate(() => localStorage.removeItem("fogpath.save"));
  await page.reload();
  await expect(page.getByRole("button", { name: "进入村庄" })).toBeVisible();

  // 导入存档 → 恢复
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "fogpath-save.json", mimeType: "application/json", buffer });
  await expect(page.getByRole("heading", { name: "村庄广场" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "继续冒险" })).toBeVisible();
});
