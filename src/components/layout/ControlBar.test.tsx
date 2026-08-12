import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initialGameState, initialPlayer } from "../../state/init";
import { generateDungeon } from "../../state/dungeonGen";
import { initBattle } from "../../state/battleEngine";
import { dungeons } from "../../data/config";
import type { DungeonRoom } from "../../types";

/** 4 个方向按钮 */
function dirButtons() {
  return {
    w: screen.getByRole("button", { name: "W" }),
    a: screen.getByRole("button", { name: "A" }),
    s: screen.getByRole("button", { name: "S" }),
    d: screen.getByRole("button", { name: "D" }),
  };
}

describe("底部操控栏（WASD 按钮）", () => {
  it("村庄广场：点击 D 向东移动到商店", async () => {
    const user = userEvent.setup();
    renderGame({ ...initialGameState(), screen: "game" });
    const { d } = dirButtons();
    expect(d).toBeEnabled();
    await user.click(d);
    expect(screen.getByRole("heading", { name: "村庄商店" })).toBeInTheDocument();
  });

  it("村庄商店：无出口方向按钮变灰，仅向西可用", () => {
    renderGame({
      ...initialGameState(),
      screen: "game",
      player: { ...initialPlayer(), currentRoomId: "village_shop" },
    });
    const { w, a, s, d } = dirButtons();
    expect(a).toBeEnabled();
    expect(w).toBeDisabled();
    expect(s).toBeDisabled();
    expect(d).toBeDisabled();
  });

  it("地牢入口：墙方向按钮变灰，有房间方向可用", () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    const { w, d } = dirButtons();
    // r1(0,2)：上方 (0,1) 是墙 → W 灰；右方 r2 有敌人 → D 可用（触发情报）
    expect(w).toBeDisabled();
    expect(d).toBeEnabled();
  });

  it("地牢：点击 D 弹出情报卡片，再点 D 保持情报（不进入）", async () => {
    const user = userEvent.setup();
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    await user.click(dirButtons().d);
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    // 情报方向按钮保持可用：再次点击仍显示情报
    expect(dirButtons().d).toBeEnabled();
    await user.click(dirButtons().d);
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "战斗" })).not.toBeInTheDocument();
    // 点「↵」按钮才开战
    await user.click(screen.getByRole("button", { name: "↵" }));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
  });

  it("情报打开时：方向按钮均可用（情报方向进入、其他方向移动）", async () => {
    const user = userEvent.setup();
    // 3×3：入口 (0,0)，南 (0,1) 有哥布林，东 (1,0) 空地
    const room = (type: DungeonRoom["type"]): DungeonRoom => ({
      type,
      explored: false,
      depth: 0,
      enemyIds: [],
      itemIds: [],
    });
    const rooms: (DungeonRoom | null)[][] = [
      [room("entrance"), room("normal"), room("normal")],
      [room("normal"), room("normal"), room("normal")],
      [room("normal"), room("normal"), room("normal")],
    ];
    rooms[0][0]!.explored = true;
    rooms[1][0]!.enemyIds = ["goblin"];
    renderGame({
      ...initialGameState(),
      screen: "game",
      dungeon: { dungeonId: "goblin_camp", size: { w: 3, h: 3 }, rooms, playerPos: { x: 0, y: 0 } },
    });
    await user.click(dirButtons().s);
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    expect(dirButtons().s).toBeEnabled(); // 情报方向：再次点击直接进入
    expect(dirButtons().d).toBeEnabled(); // 空地：移动
    await user.click(dirButtons().d);
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
  });

  it("战斗中：四个按钮全部变灰", () => {
    const battle = initBattle("test_atk_vs_atk", initialPlayer());
    renderGame({ ...initialGameState(), screen: "game", battle });
    const { w, a, s, d } = dirButtons();
    for (const b of [w, a, s, d]) expect(b).toBeDisabled();
  });

  it("展开地图时：按钮全部变灰", async () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    const user = userEvent.setup();
    const { d } = dirButtons();
    expect(d).toBeEnabled();
    // 打开世界地图后（展开地图按钮在侧栏）
    await user.click(screen.getByRole("button", { name: "展开地图" }));
    expect(d).toBeDisabled();
  });
});

describe("底部操控栏（进入/返回/撤离按钮）", () => {
  it("地牢情报打开：出现「↵」「←」，点击进入开战", async () => {
    const user = userEvent.setup();
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    await user.click(dirButtons().d); // 弹情报
    const enter = screen.getByRole("button", { name: "↵" });
    const back = screen.getByRole("button", { name: "←" });
    expect(enter).toBeInTheDocument();
    expect(back).toBeInTheDocument();
    await user.click(enter);
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
  });

  it("情报未打开：无进入/返回按钮", () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    expect(screen.queryByRole("button", { name: "↵" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "←" })).not.toBeInTheDocument();
  });

  it("村庄地牢入口：仅出现「↵」，点击进入地牢", async () => {
    const user = userEvent.setup();
    renderGame({
      ...initialGameState(),
      screen: "game",
      player: { ...initialPlayer(), currentRoomId: "goblin_camp_entrance" },
    });
    expect(screen.queryByRole("button", { name: "←" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "↵" }));
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
  });

  it("村庄普通房间：无进入按钮", () => {
    renderGame({ ...initialGameState(), screen: "game" });
    expect(screen.queryByRole("button", { name: "↵" })).not.toBeInTheDocument();
  });

  it("地牢非战斗：出现「撤离（X）」", () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    expect(screen.getByTestId("control-retreat")).toBeInTheDocument();
  });

  it("撤离确认打开：左组变为「↵」「←」，点击确认撤离回村庄", async () => {
    const user = userEvent.setup();
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    await user.click(screen.getByTestId("control-retreat"));
    expect(screen.queryByTestId("control-enter")).not.toBeInTheDocument();
    const confirm = screen.getByTestId("control-confirm");
    expect(confirm).toBeInTheDocument();
    expect(screen.getByTestId("control-back")).toBeInTheDocument();
    await user.click(confirm);
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
  });

  it("村庄：不出现「撤离（X）」", () => {
    renderGame({ ...initialGameState(), screen: "game" });
    expect(screen.queryByTestId("control-retreat")).not.toBeInTheDocument();
  });

  it("战斗中：进入/返回/撤离均不出现", () => {
    const battle = initBattle("test_atk_vs_atk", initialPlayer());
    renderGame({ ...initialGameState(), screen: "game", battle });
    expect(screen.queryByTestId("control-enter")).not.toBeInTheDocument();
    expect(screen.queryByTestId("control-back")).not.toBeInTheDocument();
    expect(screen.queryByTestId("control-retreat")).not.toBeInTheDocument();
  });
});
