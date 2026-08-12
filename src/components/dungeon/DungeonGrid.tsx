import type { DungeonState } from "../../types";
import { enemyDefs, items as itemDefs } from "../../data/config";
import { EMPTY_CELL_CLS, MINI_RADIUS, TILE } from "../map/layoutConstants";

type DungeonGridProps = {
  dungeon: DungeonState;
  large?: boolean;
  onStep?: (dir: { x: number; y: number }) => void;
};

/**
 * 地牢方块网格（小地图可点击邻居移动 / 展开大地图纯查看）：
 * - 小地图：7×7 窗口以玩家为中心，样式与村庄 HubMap 一致（房间方块 / 空位淡块 / 迷雾 "?"）
 * - 大地图：全图固定 TILE px 方块（配合世界地图拖动平移，含墙与边界）
 */
function DungeonGrid({ dungeon, large = false, onStep }: DungeonGridProps) {
  const { rooms, playerPos, size } = dungeon;
  // 可点击：玩家正交邻居（界内、非墙，迷雾格也可点——等同 WASD 走近未探索格）
  const clickableCell = (rx: number, ry: number): boolean =>
    !!onStep &&
    rx >= 0 &&
    ry >= 0 &&
    rx < size.w &&
    ry < size.h &&
    rooms[ry][rx] != null &&
    Math.abs(rx - playerPos.x) + Math.abs(ry - playerPos.y) === 1;
  const vMinX = large ? 0 : playerPos.x - MINI_RADIUS;
  const vMinY = large ? 0 : playerPos.y - MINI_RADIUS;
  const cols = large ? size.w : MINI_RADIUS * 2 + 1;
  const rows = large ? size.h : MINI_RADIUS * 2 + 1;
  const tilePx = large ? TILE : undefined;

  return (
    <div
      className="grid gap-1 w-full select-none"
      style={{
        gridTemplateColumns: tilePx
          ? `repeat(${cols}, ${tilePx}px)`
          : `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => {
          const rx = vMinX + x;
          const ry = vMinY + y;
          // 窗口超出地牢边界的格子 / 墙（无房间）：淡色空块（与村庄小地图一致）
          if (rx < 0 || ry < 0 || rx >= size.w || ry >= size.h || !rooms[ry][rx]) {
            return <div key={`${rx},${ry}`} className={EMPTY_CELL_CLS} />;
          }
          const room = rooms[ry][rx];
          const isPlayer = rx === playerPos.x && ry === playerPos.y;
          const clickable = clickableCell(rx, ry);
          if (!room.explored) {
            // 迷雾：深色块 + 文本 "?"（不用 emoji，避免小尺寸溢出）
            const cls = `aspect-square rounded-[3px] border flex items-center justify-center font-mono text-game-dim/60 ${
              isPlayer
                ? "bg-game-gold/20 border-game-gold"
                : "bg-game-bg/80 border-game-border/40"
            }`;
            const inner = <>?</>;
            if (clickable) {
              return (
                <button
                  key={`${rx},${ry}`}
                  type="button"
                  data-testid={`dungeon-cell-${rx}-${ry}`}
                  onClick={() => onStep!({ x: rx - playerPos.x, y: ry - playerPos.y })}
                  className={`${cls} cursor-pointer transition-colors hover:border-game-gold/60 hover:text-game-gold`}
                >
                  {inner}
                </button>
              );
            }
            return (
              <div key={`${rx},${ry}`} className={cls}>
                {inner}
              </div>
            );
          }
          const enemyIcon = room.enemyIds.length > 0 ? enemyDefs[room.enemyIds[0]]?.icon : null;
          const itemIcon = room.itemIds.length > 0 ? itemDefs[room.itemIds[0]]?.icon : null;
          const cls = `aspect-square flex flex-col items-center justify-center rounded-[3px] font-mono overflow-hidden border-2 ${
            isPlayer
              ? "bg-game-gold/30 border-game-gold"
              : room.type === "boss"
                ? "bg-game-red/15 border-game-red/50"
                : room.type === "entrance"
                  ? "bg-game-green/10 border-game-green/40"
                  : "bg-game-card border-game-border"
          }`;
          const inner = (
            <div className="flex items-center gap-0.5 text-sm leading-none">
              {room.type === "entrance" && "\uD83D\uDEAA"}
              {room.type === "boss" && "\uD83D\uDC51"}
              {enemyIcon && <span>{enemyIcon}</span>}
              {room.enemyIds.length > 1 && (
                <span className="text-[9px] text-game-red">x{room.enemyIds.length}</span>
              )}
              {!enemyIcon && itemIcon && <span className="text-xs">{itemIcon}</span>}
            </div>
          );
          if (clickable) {
            return (
              <button
                key={`${rx},${ry}`}
                type="button"
                data-testid={`dungeon-cell-${rx}-${ry}`}
                onClick={() => onStep!({ x: rx - playerPos.x, y: ry - playerPos.y })}
                className={`${cls} cursor-pointer transition-colors hover:bg-game-gold/10 hover:border-game-gold/60`}
              >
                {inner}
              </button>
            );
          }
          return (
            <div key={`${rx},${ry}`} title={`${rx},${ry}`} className={cls}>
              {inner}
            </div>
          );
        })
      )}
    </div>
  );
}

export default DungeonGrid;
