import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";

describe("开始面板", () => {
  it("进入村庄：切换到村庄广场视图", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← 开始面板" })).toBeInTheDocument();
  });

  it("测试战斗入口：点击场景进入战斗视图，装备动作按钮齐全", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: /攻击 vs 攻击/ }));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
    // 默认装备：剑提供普通攻击、盾提供防御、休息无条件
    expect(screen.getByRole("button", { name: /普通攻击/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /防御/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /休息/ })).toBeInTheDocument();
  });

  it("返回按钮回到开始面板后，可再次进入村庄", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    await user.click(screen.getByRole("button", { name: "← 开始面板" }));
    expect(screen.getByRole("button", { name: "进入村庄" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "进入村庄" }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
  });
});
