# 操控栏扩展与 UI 清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 底部操控栏承载全部移动/操作按钮：左侧「进入 (ENTER)」「返回 (BACKSPACE)」（仅可执行时出现）、中间 WASD、右侧「撤离（X）」（仅地牢非战斗时出现）；删除村庄出口卡片、进入地牢按钮、移动提示小字与情报卡片按钮。

**Architecture:** 操控栏按钮沿用现有模式——点击派发等效 keydown 事件（`window.dispatchEvent(new KeyboardEvent("keydown", { key }))`），行为逻辑只存在于 DungeonView/RoomView 的键盘监听器；ControlBar 仅根据状态决定按钮出现与否。App 把 `intelPending` 传给 ControlBar。

**Tech Stack:** React 19 + TypeScript + Vitest + Playwright。

## Global Constraints

- 依据 PROGRESS.md 执行待办第 2、3、5、6 项（第 4 项「进入地牢大按钮」被第 6 项取代，不实现）
- 按钮仅「可执行时出现」（不渲染），非置灰：情报打开（地牢非战斗非展开地图）→ 进入+返回；村庄房间有 dungeonId（非战斗非展开地图）→ 仅进入；地牢非战斗非展开地图 → 撤离（X）
- 文案：「进入 (ENTER)」「返回 (BACKSPACE)」新 key（`control.enter` / `control.back`）；撤离复用 `dungeon.retreat`；字号与 WASD 相同（text-sm font-mono）
- 键盘快捷键：地牢情报时 ENTER = 进入 pending 房、BACKSPACE = 关闭情报；村庄有 dungeonId 时 ENTER = 进入地牢
- 删除的 i18n key 一并清理：`room.exits`、`room.enter`、`room.enterDungeon`、`dungeon.enterRoom`、`dungeon.cancel`、`dungeon.hint`
- 每步 `npx vitest run <file>` 定向验证；收尾 `npm run lint && npm test && npm run build && npm run test:e2e`

---

### Task 1: ControlBar 扩展（进入/返回/撤离按钮）

**Files:**
- Modify: `src/components/layout/ControlBar.tsx`
- Modify: `src/App.tsx:99`（传 pending）
- Modify: `src/i18n/translations.ts`（新增 control.enter / control.back）
- Modify: `src/components/layout/ControlBar.test.tsx`

**Interfaces:**
- Consumes: `pending: { x: number; y: number } | null`（App 的 intelPending）
- Produces: 按钮点击派发 `keydown` 事件（key = "Enter" / "Backspace" / "x"），由 Task 2/3 的监听器执行

- [ ] **Step 1: i18n 新 key**

zh 增：`"control.enter": "进入 (ENTER)"`、`"control.back": "返回 (BACKSPACE)"`；en 增：`"control.enter": "Enter (ENTER)"`、`"control.back": "Back (BACKSPACE)"`。

- [ ] **Step 2: 写失败测试**（ControlBar.test.tsx 追加）

```tsx
describe("底部操控栏（进入/返回/撤离按钮）", () => {
  it("地牢情报打开：出现「进入 (ENTER)」「返回 (BACKSPACE)」，点击进入开战", async () => {
    const user = userEvent.setup();
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    await user.click(dirButtons().d); // 弹情报
    const enter = screen.getByRole("button", { name: "进入 (ENTER)" });
    const back = screen.getByRole("button", { name: "返回 (BACKSPACE)" });
    expect(enter).toBeInTheDocument();
    expect(back).toBeInTheDocument();
    await user.click(enter);
    expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
  });

  it("情报未打开：无进入/返回按钮", () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    expect(screen.queryByRole("button", { name: "进入 (ENTER)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "返回 (BACKSPACE)" })).not.toBeInTheDocument();
  });

  it("村庄地牢入口：仅出现「进入 (ENTER)」，点击进入地牢", async () => {
    const user = userEvent.setup();
    renderGame({ ...initialGameState(), screen: "game",
      player: { ...initialPlayer(), currentRoomId: "goblin_camp_entrance" } });
    expect(screen.queryByRole("button", { name: "返回 (BACKSPACE)" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "进入 (ENTER)" }));
    expect(screen.getByRole("heading", { name: /哥布林营地 · 入口/ })).toBeInTheDocument();
  });

  it("村庄普通房间：无进入按钮", () => {
    renderGame({ ...initialGameState(), screen: "game" });
    expect(screen.queryByRole("button", { name: "进入 (ENTER)" })).not.toBeInTheDocument();
  });

  it("地牢非战斗：出现「撤离（X）」；村庄：不出现", () => {
    const dungeon = generateDungeon(dungeons.goblin_camp);
    renderGame({ ...initialGameState(), screen: "game", dungeon });
    expect(screen.getByRole("button", { name: "撤离（X）" })).toBeInTheDocument();
    renderGame({ ...initialGameState(), screen: "game" });
    expect(screen.queryByRole("button", { name: "撤离（X）" })).not.toBeInTheDocument();
  });

  it("战斗中：进入/返回/撤离均不出现", () => {
    const battle = initBattle("test_atk_vs_atk", initialPlayer());
    renderGame({ ...initialGameState(), screen: "game", battle });
    expect(screen.queryByRole("button", { name: "进入 (ENTER)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "撤离（X）" })).not.toBeInTheDocument();
  });
});
```

现有用例「点「进入」按钮才开战」改为 name `"进入 (ENTER)"`。

- [ ] **Step 3: 实现 ControlBar**

`src/components/layout/ControlBar.tsx` 重写为：props 增 `pending`；计算三个出现条件（`intelOpen`、`villageEnter`、`canRetreat`，见 Global Constraints）；布局改为 flex：左按钮组（进入/返回）＋ WASD grid ＋ 右撤离按钮；按钮样式与 WASD 一致（font-mono text-sm、game-card 底色、金色 hover），点击分别派发 keydown `"Enter"` / `"Backspace"` / `"x"`；`App.tsx` 的 ControlBar 加 `pending={intelPending}`。

- [ ] **Step 4: 验证** `npx vitest run src/components/layout/ControlBar.test.tsx` 通过

### Task 2: DungeonView 清理与快捷键

**Files:**
- Modify: `src/components/dungeon/DungeonView.tsx`
- Modify: `src/components/dungeon/DungeonView.test.tsx`

- [ ] **Step 1: 更新测试**（现有「进入」→「进入 (ENTER)」、「返回」→「返回 (BACKSPACE)」；新增用例）

```tsx
it("ENTER 确认情报进入、BACKSPACE 关闭情报", async () => {
  const user = userEvent.setup();
  renderGame(miniDungeon());
  await user.keyboard("{d}");
  expect(screen.getByText("房间情报")).toBeInTheDocument();
  await user.keyboard("{Backspace}");
  expect(screen.queryByText("房间情报")).not.toBeInTheDocument();
  await user.keyboard("{d}");
  await user.keyboard("{Enter}");
  expect(screen.getByRole("heading", { name: "战斗" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 实现**：keydown 中 X 之后加 ENTER/BACKSPACE 处理（`pending` 存在时）；删除标题栏撤离按钮、`dungeon.hint` 提示行、情报卡片「进入/返回」按钮（保留情报内容与标题）；i18n key `dungeon.hint`、`dungeon.enterRoom`、`dungeon.cancel` 删除
- [ ] **Step 3: 验证** `npx vitest run src/components/dungeon/DungeonView.test.tsx` 通过

### Task 3: RoomView 清理与快捷键

**Files:**
- Modify: `src/components/room/RoomView.tsx`
- Modify: `src/components/room/RoomView.test.tsx`
- Modify: `src/i18n/translations.ts`（删 room.exits/room.enter/room.enterDungeon）

- [ ] **Step 1: 更新测试**：删除「出口按钮导航」用例；「WASD 节点导航」断言改为操控栏「进入 (ENTER)」按钮
- [ ] **Step 2: 实现**：keydown 加 ENTER（`room.dungeonId` 存在时 dispatch ENTER_DUNGEON）；删除 exits 卡片块（含「出口 · WASD」小字）与进入地牢按钮；删除 `exitArrow` 函数
- [ ] **Step 3: 验证** `npx vitest run src/components/room/RoomView.test.tsx src/components/panels/MapPanel.test.tsx` 通过（MapPanel 村庄用例依赖 heading，不受影响）

### Task 4: E2E 与全量验证

**Files:**
- Modify: `e2e/game.spec.ts`

- [ ] **Step 1: e2e 更新**：`进入地牢` 按钮 → `进入 (ENTER)`；情报 `返回` → `返回 (BACKSPACE)`、`进入`（exact）→ `进入 (ENTER)`
- [ ] **Step 2: 全量验证**：`npm run lint && npm test && npm run build && npm run test:e2e`
- [ ] **Step 3: 文档更新**：GDD 4.1（情报确认改操控栏按钮）、4.6（左右按钮 + 撤离）；PROGRESS 勾掉待办 2、3、5、6，删除第 4 项（注明被 6 取代）
- [ ] **Step 4: 提交**（按逻辑分 2-3 个提交：feat 操控栏、refactor 视图清理、docs）
