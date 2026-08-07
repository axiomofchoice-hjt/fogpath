import type { DungeonState } from "../../types";
import { enemyDefs, items as itemDefs } from "../../data/config";

type DungeonGridProps = {
  dungeon: DungeonState;
  large?: boolean;
};

/** 小地图窗口半径：显示玩家周围 (2r+1)×(2r+1) = 7×7 格，玩家始终居中 */
const MINI_RADIUS = 3;

/**
 * 地牢方块网格（纯查看）：
 * - 小地图：7×7 窗口以玩家为中心（地图更大时显示不全，玩家始终居中）
 * - 大地图：全图，方块更大
 * 迷雾（?）/ 已探索（敌人、Boss、物品图标）/ 玩家位置（金框）
 */
function DungeonGrid({ dungeon, large = false }: DungeonGridProps) {
  const { rooms, playerPos, size } = dungeon;
  const vMinX = large ? 0 : playerPos.x - MINI_RADIUS;
  const vMinY = large ? 0 : playerPos.y - MINI_RADIUS;
  const cols = large ? size.w : MINI_RADIUS * 2 + 1;
  const rows = large ? size.h : MINI_RADIUS * 2 + 1;
  const tilePx = large ? 96 : undefined;

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
          // 窗口超出地牢边界的格子：淡色空块（保持棋盘感）
          if (rx < 0 || ry < 0 || rx >= size.w || ry >= size.h) {
            return (
              <div
                key={`${rx},${ry}`}
                className="aspect-square rounded-[3px] border border-game-border/40 bg-game-panel/30"
              />
            );
          }
          const room = rooms[ry][rx];
          const isPlayer = rx === playerPos.x && ry === playerPos.y;
          if (!room.explored) {
            return (
              <div
                key={`${rx},${ry}`}
                className={`aspect-square rounded-[3px] border flex items-center justify-center font-mono text-game-dim/40 ${
                  isPlayer
                    ? "bg-game-gold/20 border-game-gold"
                    : "bg-game-bg/80 border-game-border/40"
                }`}
              >
                {"\u2753"}
              </div>
            );
          }
          const enemyIcon = room.enemyIds.length > 0 ? enemyDefs[room.enemyIds[0]]?.icon : null;
          const itemIcon = room.itemIds.length > 0 ? itemDefs[room.itemIds[0]]?.icon : null;
          return (
            <div
              key={`${rx},${ry}`}
              className={`aspect-square rounded-[3px] border-2 flex flex-col items-center justify-center font-mono ${
                isPlayer
                  ? "bg-game-gold/30 border-game-gold"
                  : room.type === "boss"
                    ? "bg-game-red/15 border-game-red/50"
                    : room.type === "entrance"
                      ? "bg-game-green/10 border-game-green/40"
                      : "bg-game-card border-game-border"
              }`}
            >
              <div className="flex items-center gap-0.5 text-sm leading-none">
                {room.type === "entrance" && "\uD83D\uDEAA"}
                {room.type === "boss" && "\uD83D\uDC51"}
                {enemyIcon && <span>{enemyIcon}</span>}
                {room.enemyIds.length > 1 && (
                  <span className="text-[9px] text-game-red">x{room.enemyIds.length}</span>
                )}
                {!enemyIcon && itemIcon && <span className="text-xs">{itemIcon}</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default DungeonGrid;
