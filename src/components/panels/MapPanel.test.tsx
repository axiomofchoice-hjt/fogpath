import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initialGameState } from "../../state/init";
import { initBattleFromEnemies } from "../../state/battleEngine";

describe("小地图点击移动：村庄", () => {
  it("点击出口房间：移动到该房间", async () => {
    const user = userEvent.setup();
    renderGame({ ...initialGameState(), screen: "game" });
    // 玩家在村庄广场 (0,0)，出口：商店 (1,0)、哥布林营地入口 (0,-1)
    await user.click(screen.getByTestId("hub-room-village_shop"));
    expect(screen.getByRole("heading", { name: "村庄商店" })).toBeInTheDocument();
  });

  it("点击另一个出口：哥布林营地入口", async () => {
    const user = userEvent.setup();
    renderGame({ ...initialGameState(), screen: "game" });
    await user.click(screen.getByTestId("hub-room-goblin_camp_entrance"));
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
  });

  it("当前房间自身（非出口）：不可点击", async () => {
    renderGame({ ...initialGameState(), screen: "game" });
    expect(screen.queryByTestId("hub-room-village_square")).not.toBeInTheDocument();
  });

  it("战斗中点击出口：不移动、不抛错", async () => {
    const user = userEvent.setup();
    const s = {
      ...initialGameState(),
      screen: "game",
      battle: initBattleFromEnemies(["goblin"], initialGameState().player),
    };
    renderGame(s);
    await user.click(screen.getByTestId("hub-room-village_shop"));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
  });
});
