# 小地图点击移动 设计文档

> 日期: 2026-08-11
> 状态: 已批准

## 目标

侧边栏小地图支持点击当前房间的相邻房间移动,效果与 WASD 完全一致。村庄与地牢都适用。展开大地图保持纯查看(拖动平移),不在本次范围。

## 现状

- 村庄 WASD(`RoomView`): `nearestInDir` + `room.exits.includes` → `dispatch(MOVE_ROOM)`
- 地牢 WASD(`DungeonView` keydown): 4 方向邻居 → 越界/墙忽略 → 未探索有敌人弹情报(pending)→ 否则 `dispatch(DUNGEON_MOVE)`
- 小地图:HUB 用 `HubMap`(MapPanel)、地牢用 `DungeonGrid`(MapPanel),都是纯查看
- `pending` 情报状态提升在 App,经 `DungeonView` props 使用
- 展开大地图 `WorldMap` 复用同一对组件(large 模式),纯查看

## 设计

### 1. 共享地牢移动判定(nav.ts 新函数)

从 DungeonView keydown 提取纯函数,键盘与点击共用,避免逻辑漂移:

```ts
type DungeonStep =
  | { kind: "blocked" }
  | { kind: "intel"; x: number; y: number }
  | { kind: "move"; dx: number; dy: number };

export function dungeonStep(
  dungeon: DungeonState,
  dir: { x: number; y: number },
  pending: { x: number; y: number } | null
): DungeonStep;
```

- 越界或墙 → `blocked`
- `pending` 指向目标格 → `intel`(重弹,与 WASD 一致)
- 目标未探索且有敌人 → `intel`
- 否则 → `move`

DungeonView keydown 与 DungeonGrid 点击都调用本函数,根据结果执行 `onPendingChange` / `dispatch(DUNGEON_MOVE)`。

### 2. 村庄小地图(HubMap)

- 新增可选 prop `onMoveRoom?: (roomId: string) => void`(不传则保持纯查看)
- 可点击判定:该格有房间,且 `room.id` 在 `roomMap[currentRoomId].exits` 中(等同 WASD 的 exits 约束)
- 可点击格样式:`cursor-pointer` + hover 边框高亮(沿用游戏金色系)
- 点击 → `onMoveRoom(room.id)`

### 3. 地牢小地图(DungeonGrid)

- 新增可选 prop `onStep?: (dir: { x: number; y: number }) => void`(不传则保持纯查看)
- 可点击判定:该格是玩家正交邻居(曼哈顿距离 1)、界内、非墙。迷雾 "?" 格也可点击(等同 WASD 走近未探索格)
- 可点击格样式:同上(cursor-pointer + hover 高亮)
- 点击 → 调 `onStep(dir)`,由调用方执行 `dungeonStep` 结果

### 4. 接线(App → SidePanel → MapPanel → 组件)

- `SidePanel` / `MapPanel` 新增 props: `pending` + `onPendingChange`,与 DungeonView 共用同一情报状态源
- MapPanel 内:
  - 村庄:`onMoveRoom={(id) => dispatch({ type: "MOVE_ROOM", roomId: id })}`,战斗中不触发
  - 地牢:`onStep={(dir) => { const r = dungeonStep(dungeon, dir, pending); if (r.kind === "intel") onPendingChange({ x: r.x, y: r.y }); else if (r.kind === "move") dispatch({ type: "DUNGEON_MOVE", dx: r.dx, dy: r.dy }); }}`,战斗中不触发
- 战斗中 guard:战斗时侧栏仍渲染,但 `state.battle` 时点击不派发任何 action(合法拒绝,业务状态非 bug,不作断言)
- WorldMap 的 large 模式不传回调,保持纯查看

### 5. 测试

- 新增 `src/components/map/nav.test.ts`:`dungeonStep` 纯函数
  - 越界 → blocked
  - 墙 → blocked
  - 未探索有敌人 → intel
  - pending 指向目标 → intel
  - 已探索 → move
- MapPanel 点击行为(用 `renderGame` 完整渲染):
  - 村庄:点击出口房间 → `currentRoomId` 变化
  - 村庄:点击非出口房间 → 不移动
  - 地牢:点击已探索邻居 → `playerPos` 变化
  - 地牢:点击迷雾有敌人邻居 → 情报卡片出现
  - 地牢:点击墙/越界格 → 不移动
  - 战斗中点小地图 → 不移动、不弹情报

## 范围外(YAGNI)

- 展开大地图点击移动(用户确认仅小地图)
- 对角线移动(游戏本身不支持)
- 点击移动到非相邻房间(仅相邻格可点)
