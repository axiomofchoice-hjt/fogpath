import { rooms as roomMap } from "../../data/config";
import type { DungeonState } from "../../types";
import { assertInvariant } from "../../state/helpers";

/** 方向键 → 坐标方向 */
export function dirFromKey(key: string): { x: number; y: number } | null {
  switch (key.toLowerCase()) {
    case "w":
      return { x: 0, y: -1 };
    case "s":
      return { x: 0, y: 1 };
    case "a":
      return { x: -1, y: 0 };
    case "d":
      return { x: 1, y: 0 };
    default:
      return null;
  }
}

/** 从当前节点出发，在给定方向上最近的可达节点（任意房间，节点导航） */
export function nearestInDir(
  currentId: string,
  dir: { x: number; y: number }
): string | null {
  const cur = roomMap[currentId];
  if (!cur) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const r of Object.values(roomMap)) {
    const dx = r.pos.x - cur.pos.x;
    const dy = r.pos.y - cur.pos.y;
    if (dir.x !== 0 && dx * dir.x <= 0) continue;
    if (dir.y !== 0 && dy * dir.y <= 0) continue;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 0) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = r.id;
    }
  }
  return best;
}

export type DungeonStep =
  | { kind: "blocked" }
  | { kind: "intel"; x: number; y: number }
  | { kind: "move"; dx: number; dy: number };

/** 地牢移动判定（小地图点击与 WASD 共用）：越界/墙 blocked、未探索有敌人或 pending 重弹 intel、否则 move */
export function dungeonStep(
  dungeon: DungeonState,
  dir: { x: number; y: number },
  pending: { x: number; y: number } | null
): DungeonStep {
  assertInvariant(
    Math.abs(dir.x) + Math.abs(dir.y) === 1,
    "dungeonStep: 方向必须是正交单位步"
  );
  const { playerPos, size, rooms } = dungeon;
  const nx = playerPos.x + dir.x;
  const ny = playerPos.y + dir.y;
  if (nx < 0 || ny < 0 || nx >= size.w || ny >= size.h) return { kind: "blocked" };
  const target = rooms[ny][nx];
  if (!target) return { kind: "blocked" };
  if (pending && nx === pending.x && ny === pending.y) {
    return { kind: "intel", x: nx, y: ny };
  }
  if (!target.explored && target.enemyIds.length > 0) {
    return { kind: "intel", x: nx, y: ny };
  }
  return { kind: "move", dx: dir.x, dy: dir.y };
}
