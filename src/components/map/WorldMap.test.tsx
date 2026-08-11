import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderGame } from "../../test/harness";
import { initialGameState } from "../../state/init";
import { generateDungeon } from "../../state/dungeonGen";
import { dungeons } from "../../data/config";

/** 取展开地图的画布（带偏移的翻译层） */
function canvasTransform(container: HTMLElement): string {
  const el = container.querySelector('[data-testid="world-map-canvas"]');
  expect(el).not.toBeNull();
  return (el as HTMLElement).style.transform;
}

describe("展开大地图：当前房间居中", () => {
  beforeEach(() => {
    // jsdom 无布局：mock 容器尺寸（与 jsdom 视口 1024×768 一致）
    vi.spyOn(window.HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1024);
    vi.spyOn(window.HTMLElement.prototype, "clientHeight", "get").mockReturnValue(768);
  });

  it("地牢：偏移按玩家格中心计算（视口中心 512/384）", () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    const { container } = renderGame({
      ...initialGameState(),
      screen: "game",
      dungeon,
    });
    fireEvent.click(screen.getByRole("button", { name: "展开地图" }));
    // 营地 48px 格 + 4px 间距：玩家 (0,2) 格中心 = (24, 128)
    expect(canvasTransform(container)).toBe("translate(488px, 256px)");
  });

  it("地牢：移动后重新展开，居中随玩家位置变化", () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    const { container } = renderGame({
      ...initialGameState(),
      screen: "game",
      dungeon: { ...dungeon, playerPos: { x: 2, y: 2 } },
    });
    fireEvent.click(screen.getByRole("button", { name: "展开地图" }));
    // 玩家 (2,2)：格中心 = (128, 128)
    expect(canvasTransform(container)).toBe("translate(384px, 256px)");
  });

  it("村庄：当前房间居中（与地牢同尺寸 48px 格 + 4px 间距）", () => {
    const { container } = renderGame({
      ...initialGameState(),
      screen: "game",
      player: { ...initialGameState().player, currentRoomId: "village_square" },
    });
    fireEvent.click(screen.getByRole("button", { name: "展开地图" }));
    // 村庄广场 pos (0,0)，minY=-1：格中心 = (24, 76)
    expect(canvasTransform(container)).toBe("translate(488px, 308px)");
  });
});
