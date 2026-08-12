import type { Dispatch } from "react";
import type { GameAction, GameState } from "../../types";
import { rooms as roomMap } from "../../data/config";
import { nearestInDir, dungeonStep } from "../map/nav";

/** 情报/撤离确认的 UI 状态（App 持有，地牢视图/侧栏/操控栏共享；键盘与按钮行为同源） */
export interface IntelState {
  pending: { x: number; y: number } | null;
  retreatOpen: boolean;
  onPendingChange: (p: { x: number; y: number } | null) => void;
  onRetreatOpenChange: (open: boolean) => void;
}

/**
 * ENTER 行为（村庄进地牢 / 撤离确认 / 房间情报确认），键盘 handler 与操控栏按钮共用。
 * 地牢外调用可传 null intel（无情报/撤离状态）。
 */
export function controlEnter(
  state: GameState,
  intel: IntelState | null,
  dispatch: Dispatch<GameAction>
): void {
  if (state.battle) return;
  if (state.dungeon) {
    if (!intel) return;
    if (intel.retreatOpen) {
      dispatch({ type: "DUNGEON_RETREAT" });
    } else if (intel.pending) {
      dispatch({ type: "DUNGEON_ENTER_TILE", x: intel.pending.x, y: intel.pending.y });
    }
    return;
  }
  const room = roomMap[state.player.currentRoomId];
  if (room?.dungeonId) dispatch({ type: "ENTER_DUNGEON", dungeonId: room.dungeonId });
}

/** BACKSPACE 行为：撤离确认/房间情报 → 关闭（无状态时无操作） */
export function controlBack(intel: IntelState | null): void {
  if (!intel) return;
  if (intel.retreatOpen) intel.onRetreatOpenChange(false);
  else if (intel.pending) intel.onPendingChange(null);
}

/** Q 行为：打开撤离确认（与情报互斥——情报随之关闭；已打开则保持） */
export function controlRetreat(intel: IntelState | null): void {
  if (!intel) return;
  intel.onPendingChange(null);
  intel.onRetreatOpenChange(true);
}

/**
 * WASD 移动行为（村庄走出口 / 地牢走 dungeonStep），键盘 handler 与操控栏按钮、小地图点击共用。
 * 地牢外可传 null intel。
 */
export function controlMoveDir(
  state: GameState,
  dir: { x: number; y: number },
  intel: IntelState | null,
  dispatch: Dispatch<GameAction>
): void {
  if (state.battle) return;
  if (state.dungeon) {
    if (!intel) return;
    // 移动（无论去向）关闭撤离确认（互斥：移动即放弃撤离）
    if (intel.retreatOpen) intel.onRetreatOpenChange(false);
    const step = dungeonStep(state.dungeon, dir, intel.pending);
    if (step.kind === "blocked") return;
    if (step.kind === "intel") {
      intel.onPendingChange({ x: step.x, y: step.y });
    } else {
      dispatch({ type: "DUNGEON_MOVE", dx: step.dx, dy: step.dy });
    }
    return;
  }
  const room = roomMap[state.player.currentRoomId];
  if (!room) return;
  const next = nearestInDir(room.id, dir);
  if (next && room.exits.includes(next)) dispatch({ type: "MOVE_ROOM", roomId: next });
}
