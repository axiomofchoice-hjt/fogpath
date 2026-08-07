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
  it("出口按钮导航：广场 → 商店 → 广场", async () => {
    const user = userEvent.setup();
    renderGame(inVillage("village_square"));
    await user.click(screen.getByRole("button", { name: /村庄商店/ }));
    expect(screen.getByRole("heading", { name: "村庄商店" })).toBeInTheDocument();
    expect(screen.getByText("商店")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /村庄广场/ }));
    expect(screen.getByRole("heading", { name: "村庄广场" })).toBeInTheDocument();
  });

  it("WASD 节点导航：从广场向北进入森林入口", async () => {
    const user = userEvent.setup();
    renderGame(inVillage("village_square"));
    await user.keyboard("{w}");
    expect(screen.getByRole("heading", { name: "森林入口" })).toBeInTheDocument();
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
});
