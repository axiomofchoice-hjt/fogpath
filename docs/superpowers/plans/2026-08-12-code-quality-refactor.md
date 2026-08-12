# 代码质量重构计划（2026-08-12）

基于全库审查(21 条),分 A/B/C 三组执行。原则:行为等价优先,测试全绿为门槛,每组合并提交。

## A. 用户可见缺陷

1. **撤离键提示错误**:`src/config/dungeons.json:49-50` 引导文本「按 X 撤离」→ 改为 Q(zh/en)
2. **英文日志着色失效**:battleEngine 日志条目加 `kind: "turn" | "victory" | "defeat" | "info"`(`msg(zh, en, kind)` 默认 info);BattleView.logClass 按 kind 着色
3. **英文描述拼接**:DungeonView.roomDescription 按语言选分隔符(zh `、`/`。`,en `, `/`. `)
4. **JSX 硬编码标点**:EquipmentPanel `，`、BattleView `：` → 新增翻译键 `battle.comma`/`battle.colon`
5. **顶栏/开始标题硬编码**:新增 `header.title`(雾之径/FOG PATH)、`header.backToStart`(← 开始面板/← Start),App/StartPanel 走 t()

## B. 一致性重构

6. **魔法字符串**:helpers 加 `GOLD_ID`;battleEngine 加 `DUNGEON_SCENARIO_ID`;替换 7 处引用
7. **USE_ITEM fail-fast 统一**:battleReducer 数据守卫(非消耗品)→ assertInvariant;资源守卫(背包不足)保留静默;引擎兜底校验提取共用谓词
8. **RESET_GAME 副作用移出 reducer**:screenReducer 不再 clearSave;StartPanel/ErrorBoundary 的 dispatch 前调用 clearSave
9. **isUsableConsumable**:helpers 提取谓词,battleReducer + battleEngine 共用
10. **computeDepths**:dungeonGen 提取 BFS 深度计算,两处共用
11. **pickWeighted**:提取到 helpers,battleEngine.pickPattern 与 dungeonGen 共用
12. **布局常量**:新建 `src/components/map/layoutConstants.ts`(TILE=48, GAP=4, MINI_RADIUS=3, EMPTY_CELL_CLS);battleEngine 加 `SHIELD_PCT`
13. **intel 状态合并**:新建 `IntelState` 接口(controlActions.ts),App 构造对象,`pending/retreatOpen` 4 prop → 1 对象,贯穿 App/SidePanel/MapPanel/DungeonView/ControlBar
14. **显式控制动作**:新建 controlActions.ts(controlEnter/controlBack/controlRetreat),键盘 handler 与按钮共调,消灭合成 keydown
15. **重复重置 effect**:删 App 的重置 effect,DungeonView effect 依赖补 dungeon
16. **样式类抽取**:`src/components/ui/buttons.tsx`(MiniOutlineButton/MiniOutlineLink/GoldWideButton),替换 5+ 处重复类串
17. **Tab 映射单源**:types.ts 加 `PANEL_TABS`,App keydown 与 TabBar 遍历同一表

## C. 清理与测试

18. 删死翻译键 `map.close`/`map.empty`(zh/en)
19. 更新过时注释:types.ts 战斗占位注释、StatusId 注释
20. 补测试:InventoryPanel(排序/装备/使用/丢弃/战斗禁用)、EquipmentPanel(战斗内装备显示)
21. BattleView.test 断言 `90/100` 用 within() 限定卡片

## 验证

每组合并后:`npm test` + `npm run lint` + `npm run build`;结束后跑 `npm run test:e2e` 全量。
