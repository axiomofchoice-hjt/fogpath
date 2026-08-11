import { useGame } from "../../state/useGame";
import { rooms as roomMap } from "../../data/config";
import { dirFromKey, nearestInDir } from "../map/nav";
import type { GameState } from "../../types";

/** 方向键布局：W 上、A/S/D 下排，与方向键一致 */
const KEYS = [
  { key: "w", col: 1, row: 0 },
  { key: "a", col: 0, row: 1 },
  { key: "s", col: 1, row: 1 },
  { key: "d", col: 2, row: 1 },
] as const;

/** 该方向是否可行动（键盘会响应）：战斗/展开地图时全禁；地牢看墙；村庄看出口 */
function isDirAvailable(
  state: GameState,
  mapOpen: boolean,
  dir: { x: number; y: number }
): boolean {
  if (state.battle || mapOpen) return false;
  if (state.dungeon) {
    const { playerPos, size, rooms } = state.dungeon;
    const nx = playerPos.x + dir.x;
    const ny = playerPos.y + dir.y;
    if (nx < 0 || ny < 0 || nx >= size.w || ny >= size.h) return false;
    return rooms[ny][nx] != null;
  }
  const room = roomMap[state.player.currentRoomId];
  if (!room) return false;
  const next = nearestInDir(room.id, dir);
  return !!next && room.exits.includes(next);
}

/** 底部操控栏：固定定位不受主界面滚动影响，点击派发与键盘一致的 keydown */
export function ControlBar({ mapOpen }: { mapOpen: boolean }) {
  const { state } = useGame();
  if (state.screen !== "game") return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 select-none">
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map(({ key, col, row }) => {
          const dir = dirFromKey(key)!;
          const disabled = !isDirAvailable(state, mapOpen, dir);
          return (
            <button
              key={key}
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key }))}
              disabled={disabled}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
              className={`w-10 h-10 rounded-md border font-mono text-sm transition-colors ${
                disabled
                  ? "border-game-border bg-game-card/50 text-game-dim cursor-not-allowed"
                  : "border-game-gold/40 bg-game-card text-game-text hover:bg-game-gold/20 hover:text-game-gold"
              }`}
            >
              {key.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
