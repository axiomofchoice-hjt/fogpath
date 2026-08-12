import type { Page } from "@playwright/test";

/**
 * 哥布林营地（静态教学关）：进入流程确定，无需随机种子——
 * 入口在左下角 (0,2)，向北一格即哨戒房（教学哥布林）。
 */
export async function enterCampDungeon(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await page.keyboard.press("w");
  await page.getByRole("button", { name: "进入地牢 (↵)" }).click();
}

/** 通过底部操控栏的「↵」按钮进入地牢 */
export async function enterCampDungeonViaControl(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "进入村庄" }).click();
  await page.keyboard.press("w");
  await page.getByTestId("control-enter").click();
}
