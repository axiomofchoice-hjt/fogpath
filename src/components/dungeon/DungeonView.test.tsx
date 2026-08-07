import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initialGameState } from "../../state/init";
import type { DungeonRoom, GameState } from "../../types";

/** 手工 3×3 地牢：入口 (0,0)、右侧 (1,0) 有哥布林的未探索房，玩家在入口 */
function miniDungeon(): GameState {
  const room = (type: DungeonRoom["type"]): DungeonRoom => ({
    type,
    explored: false,
    depth: 0,
    enemyIds: [],
    itemIds: [],
  });
  const rooms: (DungeonRoom | null)[][] = [
    [room("entrance"), room("normal"), room("normal")],
    [null, room("normal"), room("normal")],
    [room("normal"), room("normal"), room("normal")],
  ];
  rooms[0][0]!.explored = true;
  rooms[0][1]!.enemyIds = ["goblin"];
  return {
    ...initialGameState(),
    screen: "game",
    player: { ...initialGameState().player, currentRoomId: "forest_entrance" },
    dungeon: { dungeonId: "forest", size: { w: 3, h: 3 }, rooms, playerPos: { x: 0, y: 0 } },
  };
}

describe("地牢视图", () => {
  it("进入有敌人的未探索格：弹出情报面板，确认后开战", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{d}");
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    expect(screen.getByText("哥布林")).toBeInTheDocument();
    expect(screen.getByText("x1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "进入" }));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
    expect(screen.getByText("回合 0")).toBeInTheDocument();
  });

  it("情报面板可取消返回，不移动", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{d}");
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /森林 · 入口/ })).toBeInTheDocument();
  });

  it("X 撤离：地牢废弃回到村庄入口，顶栏返回按钮恢复", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    // 地牢中顶栏「← 开始面板」隐藏
    expect(screen.queryByRole("button", { name: "← 开始面板" })).not.toBeInTheDocument();
    await user.keyboard("{x}");
    expect(screen.getByRole("heading", { name: "森林入口" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入森林地牢" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← 开始面板" })).toBeInTheDocument();
  });
});
