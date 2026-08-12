import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initialGameState } from "../../state/init";
import { generateDungeon } from "../../state/dungeonGen";
import { dungeons } from "../../data/config";
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
    dungeon: { dungeonId: "goblin_camp", size: { w: 3, h: 3 }, rooms, playerPos: { x: 0, y: 0 } },
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

  it("情报面板为内联卡片而非全屏弹窗（无 fixed 遮罩）", async () => {
    const user = userEvent.setup();
    const { container } = renderGame(miniDungeon());
    await user.keyboard("{d}");
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    expect(container.querySelector(".fixed.inset-0")).toBeNull();
  });

  it("营地房间显示向导提示卡（按 roomKey 查 guide.roomHints）", () => {
    const camp = dungeons.goblin_camp;
    const d = generateDungeon(camp);
    // 玩家在哨戒房 r2
    const state: GameState = {
      ...miniDungeon(),
      player: { ...miniDungeon().player },
      dungeon: d,
    };
    state.dungeon = {
      ...d,
      playerPos: { x: 1, y: 2 },
      rooms: d.rooms.map((row, y) =>
        row.map((r, x) => (x === 1 && y === 2 ? { ...r!, explored: true } : r))
      ),
    };
    renderGame(state);
    expect(screen.getByText("老猎人")).toBeInTheDocument();
    expect(screen.getByText(/进去前看清情报/)).toBeInTheDocument();
  });

  it("情报面板可取消返回，不移动", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{d}");
    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
  });

  it("情报打开时 WASD 仍可移动：移入空地直接进入并关闭情报", async () => {
    const user = userEvent.setup();
    // 自定义：入口 (0,0)、东 (1,0) 有哥布林、南 (0,1) 空地（原为墙）
    const s = miniDungeon();
    s.dungeon!.rooms[0][1]!.enemyIds = ["goblin"];
    s.dungeon!.rooms[1][0] = { type: "normal", explored: false, depth: 0, enemyIds: [], itemIds: [] };
    renderGame(s);
    // 先弹东侧情报
    await user.keyboard("{d}");
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    // 再按 S 移入南侧空地：移动 + 情报关闭
    await user.keyboard("{s}");
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /哥布林营地 · 房间/ })).toBeInTheDocument();
  });

  it("情报打开时可移向另一有敌房：切换为新房情报", async () => {
    const user = userEvent.setup();
    const s = miniDungeon();
    s.dungeon!.rooms[0][1]!.enemyIds = ["goblin"];
    s.dungeon!.rooms[1][0] = { type: "normal", explored: false, depth: 0, enemyIds: [], itemIds: [] };
    s.dungeon!.rooms[1][1]!.enemyIds = ["goblin_brute"];
    renderGame(s);
    await user.keyboard("{d}");
    expect(screen.getByText("哥布林")).toBeInTheDocument();
    // 移入南侧空地后，再向东 → 新情报（哥布林壮汉）
    await user.keyboard("{s}");
    await user.keyboard("{d}");
    expect(screen.getByText("哥布林壮汉")).toBeInTheDocument();
  });

  it("情报打开时再按原方向：保持情报不进入", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{d}");
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    // 再按 D：情报仍在，未进入战斗
    await user.keyboard("{d}");
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "战斗" })).not.toBeInTheDocument();
  });

  it("Q 撤离：确认卡片后撤离，地牢废弃回到村庄入口，顶栏返回按钮恢复", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    // 地牢中顶栏「← 开始面板」隐藏
    expect(screen.queryByRole("button", { name: "← 开始面板" })).not.toBeInTheDocument();
    await user.keyboard("{q}");
    expect(screen.getByText("撤离确认")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入地牢 (↵)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← 开始面板" })).toBeInTheDocument();
  });

  it("撤离大按钮（与进入地牢同款）：点击弹确认卡片，确认后撤离回村庄", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.click(screen.getByTestId("retreat-big"));
    expect(screen.getByText("撤离确认")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
  });

  it("展开地图时：撤离大按钮不出现", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.click(screen.getByRole("button", { name: "展开地图" }));
    expect(screen.queryByTestId("retreat-big")).not.toBeInTheDocument();
  });

  it("展开世界地图时：WASD 不触发情报面板，Q 不弹撤离确认", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.click(screen.getByRole("button", { name: "展开地图" }));
    expect(screen.getByRole("button", { name: "← 返回" })).toBeInTheDocument();
    await user.keyboard("{d}");
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
    await user.keyboard("{q}");
    expect(screen.queryByText("撤离确认")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← 返回" })).toBeInTheDocument();
  });

  it("ENTER 确认情报进入、BACKSPACE 关闭情报", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{d}");
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    await user.keyboard("{Backspace}");
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
    await user.keyboard("{d}");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
  });

  it("情报未打开时 ENTER/BACKSPACE 无效", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{Enter}");
    await user.keyboard("{Backspace}");
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
  });

  it("Q 键弹出撤离确认卡片（覆盖关闭房间情报）；ENTER 确认撤离", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{d}");
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    await user.keyboard("{q}");
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
    expect(screen.getByText("撤离确认")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
  });

  it("撤离确认打开时：BACKSPACE 取消；WASD 移动关闭确认并弹新情报", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{q}");
    expect(screen.getByText("撤离确认")).toBeInTheDocument();
    await user.keyboard("{Backspace}");
    expect(screen.queryByText("撤离确认")).not.toBeInTheDocument();
    // 再开，然后 WASD 移动 → 确认消失、情报出现（互斥）
    await user.keyboard("{q}");
    await user.keyboard("{d}");
    expect(screen.queryByText("撤离确认")).not.toBeInTheDocument();
    expect(screen.getByText("房间情报")).toBeInTheDocument();
  });

  it("撤离确认卡片按钮：确认撤离回村庄", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.keyboard("{q}");
    await user.click(screen.getByTestId("retreat-confirm"));
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
  });
});
