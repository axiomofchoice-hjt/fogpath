import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initialGameState } from "../../state/init";
import { initBattleFromEnemies } from "../../state/battleEngine";
import type { DungeonRoom, GameState } from "../../types";

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

/** 手工 3×3 地牢：入口 (0,0) 已探索、东 (1,0) 未探索有哥布林、南 (0,1) 为墙 */
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
    dungeon: { dungeonId: "goblin_camp", size: { w: 3, h: 3 }, rooms, playerPos: { x: 0, y: 0 } },
  };
}

describe("小地图点击移动：地牢", () => {
  it("点击已探索邻居：移动", async () => {
    const user = userEvent.setup();
    const s = miniDungeon();
    s.dungeon!.rooms[0][1] = { type: "normal", explored: true, depth: 0, enemyIds: [], itemIds: [] };
    renderGame(s);
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByRole("heading", { name: /哥布林营地 · 房间/ })).toBeInTheDocument();
  });

  it("点击未探索有敌人邻居：弹情报卡片，不移动", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
  });

  it("点击墙格 / 越界格：不可点击", async () => {
    renderGame(miniDungeon());
    expect(screen.queryByTestId("dungeon-cell-0-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dungeon-cell--1-0")).not.toBeInTheDocument();
  });

  it("情报打开时点击另一有敌房：切换情报", async () => {
    const user = userEvent.setup();
    const s = miniDungeon();
    s.dungeon!.rooms[1][0] = { type: "normal", explored: false, depth: 0, enemyIds: ["goblin_brute"], itemIds: [] };
    renderGame(s);
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByText("哥布林")).toBeInTheDocument();
    await user.click(screen.getByTestId("dungeon-cell-0-1"));
    expect(screen.getByText("哥布林壮汉")).toBeInTheDocument();
  });

  it("战斗中点击小地图：不移动、不弹情报", async () => {
    const user = userEvent.setup();
    const s = miniDungeon();
    s.dungeon!.rooms[0][1] = { type: "normal", explored: true, depth: 0, enemyIds: [], itemIds: [] };
    s.battle = initBattleFromEnemies(["goblin"], s.player);
    renderGame(s);
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
  });
});
