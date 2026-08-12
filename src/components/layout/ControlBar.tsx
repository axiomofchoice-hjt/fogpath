import { useGame } from "../../state/useGame";
import { rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { dirFromKey, nearestInDir } from "../map/nav";
import type { GameState } from "../../types";
import { controlBack, controlEnter, controlMoveDir, controlRetreat, type IntelState } from "../control/controlActions";

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

/** 操控栏小按钮（进入/返回/撤离）：与键盘同一处理逻辑（派发等效 keydown） */
function ActionButton({
  label,
  testId,
  onClick,
}: {
  label: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="w-10 h-10 rounded-md border font-mono text-sm border-game-gold/40 bg-game-card text-game-text hover:bg-game-gold/20 hover:text-game-gold transition-colors"
    >
      {label}
    </button>
  );
}

/** 底部操控栏：固定定位不受主界面滚动影响，按钮与键盘同源（controlActions 共享行为）。
 *  左侧进入/返回（可执行时出现）、中间 WASD、右侧撤离（仅地牢非战斗时出现）。 */
export function ControlBar({
  mapOpen,
  intel,
}: {
  mapOpen: boolean;
  intel: IntelState;
}) {
  const { state, dispatch } = useGame();
  const { t } = useLang();
  if (state.screen !== "game") return null;

  // 情报/撤离确认打开时（战斗中/展开地图不出现）
  const intelOpen = !!state.dungeon && !!intel.pending && !state.battle && !mapOpen;
  const confirmOpen = !!state.dungeon && intel.retreatOpen && !state.battle && !mapOpen;
  // 进入：村庄房间有地牢入口时（仅进入，无返回）
  const villageEnter =
    !state.dungeon && !state.battle && !mapOpen && !!roomMap[state.player.currentRoomId]?.dungeonId;
  // 撤离：地牢内非战斗
  const canRetreat = !!state.dungeon && !state.battle && !mapOpen;

  return (
    // 文档流底栏（不悬浮）：占主界面区域（左右 16rem 侧栏之间）宽度的一行，主内容滚动区在其上方，无重叠。
    // grid 三列 1fr/auto/1fr：WASD 严格居中，左右组贴主区域边缘。
    <div className="flex-shrink-0 select-none border-t border-game-border bg-game-panel/50 pl-[calc(17rem+1rem)] pr-[calc(17rem+1rem)] py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* 左侧操作（仅可执行时出现） */}
        <div className="flex gap-1.5 justify-self-start">
          {(intelOpen || villageEnter || confirmOpen) && (
            <>
              {confirmOpen ? (
                <ActionButton testId="control-confirm" label={t("control.confirm")} onClick={() => controlEnter(state, intel, dispatch)} />
              ) : (
                <ActionButton testId="control-enter" label={t("control.enter")} onClick={() => controlEnter(state, intel, dispatch)} />
              )}
              {(intelOpen || confirmOpen) && (
                <ActionButton testId="control-back" label={t("control.back")} onClick={() => controlBack(intel)} />
              )}
            </>
          )}
        </div>
        {/* 中间 WASD */}
        <div className="grid grid-cols-3 gap-1.5">
          {KEYS.map(({ key, col, row }) => {
            const dir = dirFromKey(key)!;
            const disabled = !isDirAvailable(state, mapOpen, dir);
            return (
              <button
                key={key}
                onClick={() => controlMoveDir(state, dir, intel, dispatch)}
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
        {/* 右侧撤离（仅地牢非战斗时出现） */}
        <div className="justify-self-end">
          {canRetreat && (
            <ActionButton testId="control-retreat" label={t("control.retreat")} onClick={() => controlRetreat(intel)} />
          )}
        </div>
      </div>
    </div>
  );
}
