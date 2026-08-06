import { rooms as roomMap } from "../../data/config";

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
