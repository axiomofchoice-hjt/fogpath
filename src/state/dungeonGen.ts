import type { DungeonDef, DungeonRoom, DungeonState } from "../types";

/** 随机源（可注入便于测试） */
export type Rng = () => number;

/** 网格坐标 */
type Pos = { x: number; y: number };

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** 锚点数（含入口）：锚点散布网格，曼哈顿最小生成树作骨架 */
const ANCHOR_COUNT = 4;

/** 锚点最小曼哈顿间距（保证足迹铺开） */
const ANCHOR_MIN_SEP = 6;

/** 锚点散布尝试上限（放不满时以已放置锚点继续） */
const MAX_ANCHOR_TRIES = 1000;

/** 走廊单条步数上限（防病态种子死循环） */
const MAX_CORRIDOR_STEPS = 400;

/** 侧枝填充尝试上限（目标房间数为软约束） */
const MAX_BRANCH_TRIES = 10000;

function pickWeighted<T>(pool: T[], weight: (t: T) => number, rng: Rng): T {
  const total = pool.reduce((sum, t) => sum + weight(t), 0);
  let roll = rng() * total;
  for (const t of pool) {
    roll -= weight(t);
    if (roll < 0) return t;
  }
  return pool[pool.length - 1];
}

function pickOne<T>(list: T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)];
}

function emptyRoom(type: DungeonRoom["type"], explored: boolean): DungeonRoom {
  return { type, explored, depth: 0, enemyIds: [], itemIds: [] };
}

/**
 * 地牢生成（GDD 3.3 以撒式简化版）：
 * - N×M 稀疏网格：房间只占据部分格（null = 墙，不可通行），入口居中
 * - 锚点 + MST + 走廊：锚点散布网格（最小间距），曼哈顿最小生成树连成骨架；
 *   走廊为单调随机游走（两轴按剩余距离轻微加权交错）→ 阶梯蜿蜒不笔直，
 *   长度恰好等于曼哈顿距离（不占额外房数）、必达目标（全连通）；
 *   树骨架天然多分支 + 必经节点（割点）；成环仅来自走廊交汇（少量）
 * - 侧枝：从随机房间长出 1-3 格链（n==1 规则，死路分支）；必要时强制一个三岔节点
 * - 深度 = BFS 距离；Boss 房位于最远节点（平手取邻居最少的叶节点）
 * - 敌人池按归一化深度 0-10 加权分布（配置区间不随地图尺寸失效）
 */
export function generateDungeon(def: DungeonDef, rng: Rng = Math.random): DungeonState {
  const { w, h } = def.size;
  const rooms: (DungeonRoom | null)[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => null)
  );

  // 入口居中
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  rooms[cy][cx] = emptyRoom("entrance", true);
  const placed: Pos[] = [{ x: cx, y: cy }];

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const manhattan = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const neighborCount = (x: number, y: number) => {
    let n = 0;
    for (const d of DIRS) {
      const nx = x + d.x;
      const ny = y + d.y;
      if (inBounds(nx, ny) && rooms[ny][nx]) n++;
    }
    return n;
  };
  const place = (x: number, y: number) => {
    if (rooms[y][x]) return;
    rooms[y][x] = emptyRoom("normal", false);
    placed.push({ x, y });
  };

  // 1. 锚点：入口 + 随机散布（最小间距保证铺开）
  const anchors: Pos[] = [{ x: cx, y: cy }];
  let tries = 0;
  while (anchors.length < ANCHOR_COUNT && tries < MAX_ANCHOR_TRIES) {
    tries++;
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    if (anchors.some((p) => manhattan(p, { x, y }) < ANCHOR_MIN_SEP)) continue;
    anchors.push({ x, y });
    place(x, y);
  }

  // 2. 骨架：锚点曼哈顿最小生成树
  const inTree = new Set([0]);
  const treeEdges: { a: Pos; b: Pos }[] = [];
  while (inTree.size < anchors.length) {
    let best: { i: number; j: number; d: number } | null = null;
    for (let i = 0; i < anchors.length; i++) {
      if (inTree.has(i)) continue;
      for (const j of inTree) {
        const d = manhattan(anchors[i], anchors[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    if (!best) break;
    inTree.add(best.i);
    treeEdges.push({ a: anchors[best.i], b: anchors[best.j] });
  }

  // 3. 走廊：单调随机游走——每步只朝目标方向，两轴按剩余距离轻微加权随机交错
  //    （剩余距离大的轴略优先，其余随机）→ 阶梯蜿蜒路径，长度恰为曼哈顿距离，
  //    单调性保证必达目标（穿过已有房间免费），全连通
  for (const { a, b } of treeEdges) {
    let cur = { ...a };
    let guard = 0;
    while (manhattan(cur, b) > 0 && guard < MAX_CORRIDOR_STEPS) {
      guard++;
      const dx = b.x - cur.x;
      const dy = b.y - cur.y;
      const rx = dx !== 0 ? Math.abs(dx) : 0;
      const ry = dy !== 0 ? Math.abs(dy) : 0;
      let axis: "x" | "y";
      if (rx === 0) axis = "y";
      else if (ry === 0) axis = "x";
      else {
        // 剩余距离轻微加权（+1 平滑）+ 随机交错 → 蜿蜒不笔直
        const wx = rx + 1;
        const wy = ry + 1;
        axis = rng() * (wx + wy) < wx ? "x" : "y";
      }
      const x = cur.x + (axis === "x" ? (dx > 0 ? 1 : -1) : 0);
      const y = cur.y + (axis === "y" ? (dy > 0 ? 1 : -1) : 0);
      place(x, y);
      cur = { x, y };
    }
  }

  // 4. 侧枝：从随机已有房间长出 1-3 格链（n==1 规则，死路分支）填充至目标房间数
  let branchTries = 0;
  while (placed.length < def.roomCount && branchTries < MAX_BRANCH_TRIES) {
    branchTries++;
    const root = pickOne(placed, rng);
    const len = 1 + Math.floor(rng() * 3); // 分支长度 1-3 格
    let cur = root;
    for (let i = 0; i < len; i++) {
      const dir = pickOne(DIRS, rng);
      const x = cur.x + dir.x;
      const y = cur.y + dir.y;
      if (!inBounds(x, y) || rooms[y][x] || neighborCount(x, y) !== 1) break;
      place(x, y);
      cur = { x, y };
    }
  }

  // 5. 多分支保证：若没有度数 ≥3 的房间，给一个度数 2 的房间接枝
  const degree = (p: Pos) => neighborCount(p.x, p.y);
  if (!placed.some((p) => degree(p) >= 3)) {
    for (const root of placed.filter((p) => degree(p) === 2)) {
      for (const dir of DIRS) {
        const x = root.x + dir.x;
        const y = root.y + dir.y;
        if (inBounds(x, y) && !rooms[y][x] && neighborCount(x, y) === 1) {
          place(x, y);
          break;
        }
      }
      if (placed.some((p) => degree(p) >= 3)) break;
    }
  }

  // BFS 深度（从入口的最短步数）
  const queue: { x: number; y: number }[] = [{ x: cx, y: cy }];
  const seen = new Set([`${cx},${cy}`]);
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const d of DIRS) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!rooms[ny][nx] || seen.has(`${nx},${ny}`)) continue;
      rooms[ny][nx]!.depth = rooms[cur.y][cur.x]!.depth + 1;
      seen.add(`${nx},${ny}`);
      queue.push({ x: nx, y: ny });
    }
  }

  // Boss 房：最深处中取邻居最少的（叶节点，以撒式），并列随机取一
  let bossDepth = 0;
  for (const room of placed) bossDepth = Math.max(bossDepth, rooms[room.y][room.x]!.depth);
  const deepest: (Pos & { neighbors: number })[] = [];
  for (const p of placed) {
    if (rooms[p.y][p.x]!.depth !== bossDepth) continue;
    let neighbors = 0;
    for (const d of DIRS) {
      const nx = p.x + d.x;
      const ny = p.y + d.y;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && rooms[ny][nx]) neighbors++;
    }
    deepest.push({ x: p.x, y: p.y, neighbors });
  }
  const minNeighbors = Math.min(...deepest.map((p) => p.neighbors));
  const bossPos = pickOne(
    deepest.filter((p) => p.neighbors === minNeighbors),
    rng
  );
  rooms[bossPos.y][bossPos.x]!.type = "boss";
  rooms[bossPos.y][bossPos.x]!.enemyIds = [def.bossId];

  // 归一化深度（0-10）：敌人池区间与地图尺寸解耦（bossDepth 恒 > 0，防御除零）
  const normDepth = (x: number, y: number) =>
    Math.floor((rooms[y][x]!.depth * 10) / (bossDepth || 1));

  // 普通房：敌人 + 物品
  for (const room of placed) {
    if (room.x === cx && room.y === cy) continue;
    if (room.x === bossPos.x && room.y === bossPos.y) continue;
    const depth = normDepth(room.x, room.y);
    const enemyChance =
      depth === 0 ? 0.15 : depth <= 2 ? 0.4 : depth <= 5 ? 0.55 : 0.7;
    if (rng() < enemyChance) {
      const candidates = def.enemyPool.filter(
        (e) => depth >= e.minDepth && depth <= e.maxDepth
      );
      const picked =
        candidates.length > 0
          ? pickWeighted(candidates, (e) => e.weight, rng)
          : undefined;
      if (picked) {
        rooms[room.y][room.x]!.enemyIds.push(picked.enemyId);
        // 深层有概率双怪
        if (depth >= 2 && rng() < 0.15) {
          const second = pickWeighted(candidates, (e) => e.weight, rng);
          if (second) rooms[room.y][room.x]!.enemyIds.push(second.enemyId);
        }
      }
    }
    if (rng() < 0.3 && def.itemPool.length > 0) {
      rooms[room.y][room.x]!.itemIds.push(pickOne(def.itemPool, rng));
    }
  }

  // Boss 房宝箱：固定 2 件物品池物品
  for (let i = 0; i < 2 && def.itemPool.length > 0; i++) {
    rooms[bossPos.y][bossPos.x]!.itemIds.push(pickOne(def.itemPool, rng));
  }

  return {
    dungeonId: def.id,
    size: { w, h },
    rooms,
    playerPos: { x: cx, y: cy },
  };
}
