import { describe, expect, it } from "vitest";
import { dungeonStep } from "./nav";
import type { DungeonRoom, DungeonState } from "../../types";

function room(type: DungeonRoom["type"]): DungeonRoom {
  return { type, explored: false, depth: 0, enemyIds: [], itemIds: [] };
}

/** 3×3 地牢：玩家 (0,0) 入口（已探索），东 (1,0) 未探索有哥布林，南 (0,1) 为墙 */
function dungeon(overrides: Partial<DungeonState> = {}): DungeonState {
  const rooms: (DungeonRoom | null)[][] = [
    [room("entrance"), room("normal"), room("normal")],
    [null, room("normal"), room("normal")],
    [room("normal"), room("normal"), room("normal")],
  ];
  rooms[0][0]!.explored = true;
  rooms[0][1]!.enemyIds = ["goblin"];
  return {
    dungeonId: "goblin_camp",
    size: { w: 3, h: 3 },
    rooms,
    playerPos: { x: 0, y: 0 },
    ...overrides,
  };
}

describe("dungeonStep（小地图点击与 WASD 共用的移动判定）", () => {
  it("越界：blocked", () => {
    expect(dungeonStep(dungeon(), { x: -1, y: 0 }, null)).toEqual({ kind: "blocked" });
  });

  it("墙：blocked", () => {
    expect(dungeonStep(dungeon(), { x: 0, y: 1 }, null)).toEqual({ kind: "blocked" });
  });

  it("未探索有敌人：intel", () => {
    expect(dungeonStep(dungeon(), { x: 1, y: 0 }, null)).toEqual({ kind: "intel", x: 1, y: 0 });
  });

  it("未探索无敌人：move", () => {
    const d = dungeon();
    d.rooms[1][0] = { type: "normal", explored: false, depth: 0, enemyIds: [], itemIds: [] };
    expect(dungeonStep(d, { x: 0, y: 1 }, null)).toEqual({ kind: "move", dx: 0, dy: 1 });
  });

  it("已探索：move", () => {
    const d = dungeon();
    d.rooms[0][1]!.explored = true;
    expect(dungeonStep(d, { x: 1, y: 0 }, null)).toEqual({ kind: "move", dx: 1, dy: 0 });
  });

  it("pending 指向目标格：intel 重弹（不进入）", () => {
    const d = dungeon();
    d.rooms[0][1]!.explored = true;
    expect(dungeonStep(d, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual({ kind: "intel", x: 1, y: 0 });
  });

  it("pending 指向其他格：正常 move", () => {
    const d = dungeon();
    d.rooms[0][1]!.explored = true;
    expect(dungeonStep(d, { x: 1, y: 0 }, { x: 0, y: 1 })).toEqual({ kind: "move", dx: 1, dy: 0 });
  });

  it("非单位步方向：断言失败", () => {
    expect(() => dungeonStep(dungeon(), { x: 2, y: 0 }, null)).toThrow(/dungeonStep/);
    expect(() => dungeonStep(dungeon(), { x: 0, y: 0 }, null)).toThrow(/dungeonStep/);
  });
});
