# 小地图点击移动 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 侧边栏小地图支持点击相邻房间移动,村庄与地牢效果等同 WASD。

**Architecture:** 从 DungeonView 键盘移动逻辑中提取共享纯函数 `dungeonStep`(nav.ts),键盘与点击走同一判定;HubMap/DungeonGrid 新增可选回调 prop,不传即保持纯查看(展开大地图不受影响);MapPanel 接线 dispatch,情报状态(pending)从 App 经 SidePanel 透传。

**Tech Stack:** React 19 + TypeScript + Vitest(RTL + user-event)。

## Global Constraints

- 依据 spec:`docs/superpowers/specs/2026-08-11-minimap-click-move-design.md`
- 可点击格必须加 `cursor-pointer` 与 hover 高亮(金色系,参照 ControlBar 的 `hover:bg-game-gold/20`)
- 战斗中点击小地图:合法拒绝,不派发任何 action、不弹情报(业务状态非 bug,不用 assert)
- 展开大地图(large 模式)不传回调,保持纯查看,不改动其行为
- 完成每步后跑 `npm run lint` 与 `npm test`(仅本任务文件时可用 vitest 定向运行)
- 提交信息风格: `feat: ...` / `refactor: ...`,参考 `git log --oneline`

---

### Task 1: 共享移动判定 dungeonStep(nav.ts)+ DungeonView 键盘重构

**Files:**
- Modify: `src/components/map/nav.ts`
- Create: `src/components/map/nav.test.ts`
- Modify: `src/components/dungeon/DungeonView.tsx:53-84`(keydown 改用 dungeonStep)

**Interfaces:**
- Consumes: `DungeonState` 类型(`src/types.ts` 导出)、`assertInvariant`(`src/state/helpers.ts` 导出)
- Produces:
  ```ts
  export type DungeonStep =
    | { kind: "blocked" }
    | { kind: "intel"; x: number; y: number }
    | { kind: "move"; dx: number; dy: number };
  export function dungeonStep(
    dungeon: DungeonState,
    dir: { x: number; y: number },
    pending: { x: number; y: number } | null
  ): DungeonStep;
  ```
  Task 3 的 MapPanel 点击与 Task 1 的 DungeonView 键盘都依赖它。语义:越界/墙 → `blocked`;`pending` 指向目标格 → `intel`(重弹,不进入);目标未探索且有敌人 → `intel`;否则 → `move`。`dir` 必须是正交单位步,否则断言失败。

- [ ] **Step 1: 写失败测试**

创建 `src/components/map/nav.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/components/map/nav.test.ts`
Expected: FAIL(dungeonStep 未定义)

- [ ] **Step 3: 实现 dungeonStep**

在 `src/components/map/nav.ts` 中追加(文件头部新增 import):

```ts
import type { DungeonState } from "../../types";
import { assertInvariant } from "../../state/helpers";
```

文件末尾追加:

```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/components/map/nav.test.ts`
Expected: PASS(8 个用例)

- [ ] **Step 5: 重构 DungeonView 键盘逻辑**

`src/components/dungeon/DungeonView.tsx`:
- 第 7 行 import 改为 `import { dirFromKey, dungeonStep } from "../map/nav";`
- 把 keydown 里 `const { playerPos } = dungeon;` 之后到 `dispatch({ type: "DUNGEON_MOVE", ... })` 的整段替换为:

```ts
      const step = dungeonStep(dungeon, dir, pending);
      if (step.kind === "blocked") return;
      if (step.kind === "intel") {
        onPendingChange({ x: step.x, y: step.y });
      } else {
        dispatch({ type: "DUNGEON_MOVE", dx: step.dx, dy: step.dy });
      }
```

- [ ] **Step 6: 回归验证**

Run: `npx vitest run src/components/dungeon/DungeonView.test.tsx src/state/dungeonReducer.test.ts`
Expected: PASS(行为不变)

- [ ] **Step 7: 提交**

```bash
git add src/components/map/nav.ts src/components/map/nav.test.ts src/components/dungeon/DungeonView.tsx
git commit -m "refactor: 地牢移动判定提取为 dungeonStep 纯函数（键盘/点击共用）"
```

---

### Task 2: 村庄小地图点击移动(HubMap + MapPanel)

**Files:**
- Modify: `src/components/map/HubMap.tsx`
- Modify: `src/components/panels/MapPanel.tsx`
- Create: `src/components/panels/MapPanel.test.tsx`(村庄部分)

**Interfaces:**
- Consumes: `HubMapProps` 新增可选 prop;`useGame` 的 `dispatch`(MapPanel 已有 `state`)
- Produces:
  ```ts
  export type HubMapProps = {
    currentRoomId: string;
    large?: boolean;
    onMoveRoom?: (roomId: string) => void; // 不传 = 纯查看（展开大地图）
  };
  ```
  可点击格(小地图中):有房间且 `room.id` 在当前房间 `exits` 中;渲染为 `<button type="button" data-testid={`hub-room-${room.id}`}>`,点击调 `onMoveRoom(room.id)`。MapPanel 仅新增 `moveRoom` 内部函数(用现有 `useGame().dispatch`),props 不变——pending 透传在 Task 3 一并做。

- [ ] **Step 1: 写失败测试**

在 `src/components/panels/MapPanel.test.tsx` 中创建村庄部分(文件为新建):

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initialGameState } from "../../state/init";
import { initBattleFromEnemies } from "../../state/battleEngine";

describe("小地图点击移动：村庄", () => {
  it("点击出口房间：移动到该房间", async () => {
    const user = userEvent.setup();
    renderGame({ ...initialGameState(), screen: "game" });
    // 玩家在村庄广场 (0,0)，出口：商店 (1,0)、哥布林营地入口 (0,-1)
    await user.click(screen.getByTestId("hub-room-village_shop"));
    expect(screen.getByRole("heading", { name: "村庄商店" })).toBeInTheDocument();
  });

  it("点击另一个出口：哥布林营地入口", async () => {
    const user = userEvent.setup();
    renderGame({ ...initialGameState(), screen: "game" });
    await user.click(screen.getByTestId("hub-room-goblin_camp_entrance"));
    expect(screen.getByRole("heading", { name: "哥布林营地入口" })).toBeInTheDocument();
  });

  it("当前房间自身（非出口）：不可点击", async () => {
    renderGame({ ...initialGameState(), screen: "game" });
    expect(screen.queryByTestId("hub-room-village_square")).not.toBeInTheDocument();
  });

  it("战斗中点击出口：不移动、不抛错", async () => {
    const user = userEvent.setup();
    const s = {
      ...initialGameState(),
      screen: "game",
      battle: initBattleFromEnemies(["goblin"], initialGameState().player),
    };
    renderGame(s);
    await user.click(screen.getByTestId("hub-room-village_shop"));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/components/panels/MapPanel.test.tsx`
Expected: FAIL(`hub-room-village_shop` 找不到)

- [ ] **Step 3: 实现 HubMap onMoveRoom**

`src/components/map/HubMap.tsx`:

```tsx
export type HubMapProps = {
  currentRoomId: string;
  large?: boolean;
  onMoveRoom?: (roomId: string) => void;
};

function HubMap({ currentRoomId, large = false, onMoveRoom }: HubMapProps) {
```

房间格渲染改为:先计算 `const isCurrent = room.id === currentRoomId;` 与 `const clickable = !!onMoveRoom && !isCurrent && current.exits.includes(room.id);`,把原有 `title` + 两个 `span` 内容提取为 `const content = (...);`(结构不变),然后:

```tsx
        const isCurrent = room.id === currentRoomId;
        const clickable = !!onMoveRoom && !isCurrent && current.exits.includes(room.id);
        const base =
          "aspect-square flex flex-col items-center justify-center rounded-[3px] font-mono overflow-hidden border-2 " +
          (isCurrent ? "bg-game-gold/30 border-game-gold" : "bg-game-card border-game-border");
        const content = (
          <>
            <span className={large ? "text-2xl" : "text-sm"}>
              {room.npc?.icon ?? "\uD83C\uDFD9\uFE0F"}
            </span>
            {large && (
              <span
                className={`text-[9px] leading-tight mt-0.5 px-1 truncate max-w-full ${
                  isCurrent ? "text-game-gold" : "text-game-text"
                }`}
              >
                {loc(room.name, lang)}
              </span>
            )}
          </>
        );
        if (clickable) {
          return (
            <button
              key={key}
              type="button"
              data-testid={`hub-room-${room.id}`}
              title={loc(room.name, lang)}
              onClick={() => onMoveRoom(room.id)}
              className={`${base} cursor-pointer transition-colors hover:bg-game-gold/10 hover:border-game-gold/60`}
            >
              {content}
            </button>
          );
        }
        return (
          <div key={key} title={loc(room.name, lang)} className={base}>
            {content}
          </div>
        );
```

- [ ] **Step 4: 实现 MapPanel 接线**

`src/components/panels/MapPanel.tsx`:

```tsx
function MapPanel({ onExpand }: { onExpand: () => void }) {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

  // 战斗中不响应点击（合法拒绝：战斗时侧栏仍渲染但不可移动）
  const moveRoom = (roomId: string) => {
    if (state.battle) return;
    dispatch({ type: "MOVE_ROOM", roomId });
  };
```

村庄分支的 HubMap 改为 `<HubMap currentRoomId={player.currentRoomId} onMoveRoom={moveRoom} />`。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/components/panels/MapPanel.test.tsx`
Expected: PASS(4 个用例)

- [ ] **Step 6: 提交**

```bash
git add src/components/map/HubMap.tsx src/components/panels/MapPanel.tsx src/components/panels/MapPanel.test.tsx
git commit -m "feat: 村庄小地图点击出口房间移动"
```

---

### Task 3: 地牢小地图点击移动(DungeonGrid + props 透传)

**Files:**
- Modify: `src/components/dungeon/DungeonGrid.tsx`
- Modify: `src/components/panels/MapPanel.tsx`(地牢分支)
- Modify: `src/components/layout/SidePanel.tsx`
- Modify: `src/App.tsx:93-97`
- Modify: `src/components/panels/MapPanel.test.tsx`(追加地牢部分)

**Interfaces:**
- Consumes: `dungeonStep`/`DungeonStep`(Task 1)、MapPanelProps 新字段(Task 2)
- Produces:
  ```ts
  type DungeonGridProps = {
    dungeon: DungeonState;
    large?: boolean;
    onStep?: (dir: { x: number; y: number }) => void; // 不传 = 纯查看（展开大地图）
  };
  ```
  可点击格(小地图中):界内、非墙、与玩家曼哈顿距离 1(迷雾 "?" 格也可点);渲染为 `<button type="button" data-testid={`dungeon-cell-${rx}-${ry}`}>`,点击调 `onStep({ x: rx - playerPos.x, y: ry - playerPos.y })`。
- SidePanelProps 新增 `pending` + `onPendingChange`(与 MapPanelProps 同名同型),App 传入 `intelPending`/`setIntelPending`。

- [ ] **Step 1: 写失败测试**

在 `src/components/panels/MapPanel.test.tsx` 追加(文件头部 import 增加 `generateDungeon`/`dungeons`?不需要,用本地 miniDungeon;增加 `DungeonRoom`, `GameState` 类型 import):

```tsx
import type { DungeonRoom, GameState } from "../../types";

/** 手工 3×3 地牢：入口 (0,0) 已探索、东 (1,0) 未探索有哥布林、南 (0,1) 为墙 */
function miniDungeon(): GameState {
  const room = (type: DungeonRoom["type"]): DungeonRoom => ({
    type,
    explored: false,
    depth: 0,
    enemyIds: [],
    itemIds: [],
  });
  const rooms: (DungeonRoom | null)[][] = [
    [room("entrance"), room("normal"), room("normal")],
    [null, room("normal"), room("normal")],
    [room("normal"), room("normal"), room("normal")],
  ];
  rooms[0][0]!.explored = true;
  rooms[0][1]!.enemyIds = ["goblin"];
  return {
    ...initialGameState(),
    screen: "game",
    player: { ...initialGameState().player, currentRoomId: "forest_entrance" },
    dungeon: { dungeonId: "goblin_camp", size: { w: 3, h: 3 }, rooms, playerPos: { x: 0, y: 0 } },
  };
}

describe("小地图点击移动：地牢", () => {
  it("点击已探索邻居：移动", async () => {
    const user = userEvent.setup();
    const s = miniDungeon();
    s.dungeon!.rooms[0][1] = { type: "normal", explored: true, depth: 0, enemyIds: [], itemIds: [] };
    renderGame(s);
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByRole("heading", { name: /哥布林营地 · 房间/ })).toBeInTheDocument();
  });

  it("点击未探索有敌人邻居：弹情报卡片，不移动", async () => {
    const user = userEvent.setup();
    renderGame(miniDungeon());
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByText("房间情报")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
  });

  it("点击墙格 / 越界格：不可点击", async () => {
    renderGame(miniDungeon());
    expect(screen.queryByTestId("dungeon-cell-0-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dungeon-cell--1-0")).not.toBeInTheDocument();
  });

  it("情报打开时点击另一有敌房：切换情报", async () => {
    const user = userEvent.setup();
    const s = miniDungeon();
    s.dungeon!.rooms[1][0] = { type: "normal", explored: false, depth: 0, enemyIds: ["goblin_brute"], itemIds: [] };
    renderGame(s);
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByText("哥布林")).toBeInTheDocument();
    await user.click(screen.getByTestId("dungeon-cell-0-1"));
    expect(screen.getByText("哥布林壮汉")).toBeInTheDocument();
  });

  it("战斗中点击小地图：不移动、不弹情报", async () => {
    const user = userEvent.setup();
    const s = miniDungeon();
    s.dungeon!.rooms[0][1] = { type: "normal", explored: true, depth: 0, enemyIds: [], itemIds: [] };
    s.battle = initBattleFromEnemies(["goblin"], s.player);
    renderGame(s);
    await user.click(screen.getByTestId("dungeon-cell-1-0"));
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
    expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
  });
});
```

注:`dungeon-cell--1-0` 为越界格 (rx=-1, ry=0) 的 testid;「切换情报」用例中 (0,1) 原为墙,已被改为有敌房(rooms[1][0] = 坐标 (0,1)),点击 → dungeonStep 返回 intel → 情报从哥布林切换到哥布林壮汉,与 WASD 行为一致。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/components/panels/MapPanel.test.tsx`
Expected: FAIL(地牢用例找不到 `dungeon-cell-1-0`)

- [ ] **Step 3: 实现 DungeonGrid onStep**

`src/components/dungeon/DungeonGrid.tsx`:

```tsx
type DungeonGridProps = {
  dungeon: DungeonState;
  large?: boolean;
  onStep?: (dir: { x: number; y: number }) => void;
};

function DungeonGrid({ dungeon, large = false, onStep }: DungeonGridProps) {
```

在 `const { rooms, playerPos, size } = dungeon;` 后加:

```tsx
  // 可点击：玩家正交邻居（界内、非墙，迷雾格也可点——等同 WASD 走近未探索格）
  const clickableCell = (rx: number, ry: number): boolean =>
    !!onStep &&
    rx >= 0 && ry >= 0 && rx < size.w && ry < size.h &&
    rooms[ry][rx] != null &&
    Math.abs(rx - playerPos.x) + Math.abs(ry - playerPos.y) === 1;
```

把每个分支的 return 改为:先按原样构造内容变量(空位/迷雾/房间三种分支的 className 与内容不变),然后统一包装。具体:在 map 回调开头计算 `const clickable = clickableCell(rx, ry);`,空位与迷雾分支的 return 改为 `return clickable ? wrap(...) : div`——但空位/越界分支 clickable 必为 false,保持原样;仅「迷雾」与「房间」两个分支需要按钮包装。修改如下:

- 迷雾分支:

```tsx
          const clickable = clickableCell(rx, ry);
          if (!room.explored) {
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
                  onClick={() => onStep({ x: rx - playerPos.x, y: ry - playerPos.y })}
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
```

- 房间分支(替换原 66-90 行的 return 部分;`enemyIcon`/`itemIcon` 计算保持在原处):

```tsx
          const clickable = clickableCell(rx, ry);
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
                onClick={() => onStep({ x: rx - playerPos.x, y: ry - playerPos.y })}
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
```

- [ ] **Step 4: 实现 MapPanel 地牢接线 + SidePanel/App 透传**

`src/components/panels/MapPanel.tsx` 顶部 import 增加 `import { dungeonStep } from "../map/nav";`,函数签名与组件内改为:

```tsx
type MapPanelProps = {
  onExpand: () => void;
  pending: { x: number; y: number } | null;
  onPendingChange: (p: { x: number; y: number } | null) => void;
};

function MapPanel({ onExpand, pending, onPendingChange }: MapPanelProps) {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

  // 战斗中不响应点击（合法拒绝：战斗时侧栏仍渲染但不可移动）
  const moveRoom = (roomId: string) => {
    if (state.battle) return;
    dispatch({ type: "MOVE_ROOM", roomId });
  };

  // 地牢点击：与 WASD 同一判定（dungeonStep），战斗中不响应
  const stepDir = (dir: { x: number; y: number }) => {
    if (state.battle || !state.dungeon) return;
    const step = dungeonStep(state.dungeon, dir, pending);
    if (step.kind === "intel") onPendingChange({ x: step.x, y: step.y });
    else if (step.kind === "move") dispatch({ type: "DUNGEON_MOVE", dx: step.dx, dy: step.dy });
  };
```

地牢分支改为 `<DungeonGrid dungeon={state.dungeon} onStep={stepDir} />`。

`src/components/layout/SidePanel.tsx`:

```tsx
type SidePanelProps = {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onExpandMap: () => void;
  pending: { x: number; y: number } | null;
  onPendingChange: (p: { x: number; y: number } | null) => void;
};

function SidePanel({ activeTab, onTabChange, onExpandMap, pending, onPendingChange }: SidePanelProps) {
```

MapPanel 调用处加 `pending={pending} onPendingChange={onPendingChange}`。

`src/App.tsx` 的 SidePanel 调用(93-97 行)加 `pending={intelPending} onPendingChange={setIntelPending}`。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/components/panels/MapPanel.test.tsx src/components/map/WorldMap.test.tsx src/components/dungeon/DungeonView.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/components/dungeon/DungeonGrid.tsx src/components/panels/MapPanel.tsx src/components/layout/SidePanel.tsx src/App.tsx src/components/panels/MapPanel.test.tsx
git commit -m "feat: 地牢小地图点击邻居移动/弹情报（与 WASD 同一判定）"
```

---

### Task 4: GDD 更新

**Files:**
- Modify: `GDD.md`

**背景:** 4.1 第 376 行「地牢内不保留点击传送」与新功能存在表面矛盾,必须澄清为「不保留任意距离的点击传送,相邻格点击移动是 WASD 等价操作」。

- [ ] **Step 1: 更新 4.1 地牢操作**

`GDD.md` 4.1 节(约 371-376 行):
- 在「**WASD 移动**」条目后新增:

```markdown
- **小地图点击移动**：侧栏小地图点击当前房间的相邻格，效果与 WASD 完全一致——未探索有敌房弹情报卡片、情报中重复点击保持情报、其余直接进入；村庄同理（点击出口房间）
- **不保留点击传送**：仅相邻格可点击移动，任意距离的点击传送不保留
```

- 原「- 地牢内不保留点击传送」条目删除(由上面两条取代)。

- [ ] **Step 2: 更新 4.5 小地图说明**

`GDD.md` 4.5 节「**小地图（村庄与地牢统一，7×7 方块窗口、玩家居中）：**」段落(约 430 行)末尾追加:

```markdown
可点击：村庄为当前房间的出口房间、地牢为玩家正交相邻格（含迷雾格）；点击与 WASD 同一移动判定，效果一致。可点击格 hover 金色高亮 + cursor-pointer；战斗中不可点击。
```

- [ ] **Step 3: 更新已实现功能表**

`GDD.md` 功能表(约 576-588 行),在「进房情报卡片」与「地牢 WASD 移动」两行之间插入:

```markdown
| 小地图点击移动（村庄出口 / 地牢相邻格，与 WASD 同一判定：情报触发/保持/直接进入一致）                         | 已实现   |
```

- [ ] **Step 4: 检查与提交**

```bash
git add GDD.md
git commit -m "docs: GDD 更新小地图点击移动（4.1/4.5/功能表）"
```

---

### Task 5: 全量验证

**Files:** 无改动

- [ ] **Step 1: lint**

Run: `npm run lint`
Expected: 无报错

- [ ] **Step 2: 单元测试全量**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: tsc + vite build 成功

- [ ] **Step 4: E2E 回归**

Run: `npm run test:e2e`
Expected: PASS(Playwright 自动启动 dev server;村庄/世界地图流程未被破坏)

- [ ] **Step 5: 确认提交历史**

Run: `git log --oneline -6`
Expected: 本特性 4 个提交在顶(design 文档提交、refactor、feat ×2、docs GDD)
