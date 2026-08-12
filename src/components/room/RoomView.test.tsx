import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initialGameState } from "../../state/init";
import type { GameState } from "../../types";

function inVillage(currentRoomId: string): GameState {
  return {
    ...initialGameState(),
    screen: "game",
    player: { ...initialGameState().player, currentRoomId },
  };
}

describe("村庄房间视图", () => {
  it("WASD 节点导航：从广场向北进入哥布林营地入口，出现进入地牢大按钮", async () => {
    const user = userEvent.setup();
    renderGame(inVillage("village_square"));
    await user.keyboard("{w}");
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入地牢 (↵)" })).toBeInTheDocument();
    // 操控栏「↵」同步出现（与地牢入口按钮并存）
    expect(screen.getByRole("button", { name: "确认" })).toBeInTheDocument();
  });

  it("村庄房间不再显示出口卡片列表", () => {
    renderGame(inVillage("village_square"));
    // 出口移动入口仅在小地图与操控栏：无「出口 · WASD」标题、无出口名称按钮
    expect(screen.queryByText("出口 · WASD")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /村庄商店/ })).not.toBeInTheDocument();
  });

  it("ENTER 进入地牢（营地入口房间）", async () => {
    const user = userEvent.setup();
    renderGame(inVillage("goblin_camp_entrance"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
  });

  it("商店购买：金币实时扣减，金币不足禁用购买", async () => {
    const user = userEvent.setup();
    renderGame(inVillage("village_shop"));
    expect(screen.getByText("金币 20")).toBeInTheDocument();
    // 货架（顺序固定）：草药 5、治疗药水 10、法力药水 8
    const buys = screen.getAllByRole("button", { name: "购买" });
    expect(buys).toHaveLength(3);
    await user.click(buys[0]); // 草药 5 → 15
    expect(screen.getByText("金币 15")).toBeInTheDocument();
    await user.click(buys[2]); // 法力药水 8 → 7
    expect(screen.getByText("金币 7")).toBeInTheDocument();
    // 7 < 10/8：治疗药水与法力药水不可买，仅草药可买
    expect(screen.getAllByRole("button", { name: "购买" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "金币不足" })).toHaveLength(2);
  });

  it("村庄拾取：广场草药入背包并消失", async () => {
    const user = userEvent.setup();
    renderGame(inVillage("village_square"));
    // InteractCard 为可点击 div（非 button），通过文字定位点击
    await user.click(screen.getByText("拾取"));
    expect(screen.queryByText("拾取")).not.toBeInTheDocument();
    // 切到背包标签确认
    await user.click(screen.getByRole("button", { name: /背包/ }));
    expect(screen.getByText("草药捆")).toBeInTheDocument();
  });

  it("村庄拾取：InteractCard 可键盘操作（可聚焦 + Enter 触发拾取）", async () => {
    const user = userEvent.setup();
    renderGame(inVillage("village_square"));
    const card = screen.getByRole("button", { name: /拾取/ });
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByText("拾取")).not.toBeInTheDocument();
  });
});
