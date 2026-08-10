# AGENTS.md

## 开发环境

- 用户只用 `npm run dev` 测试游戏（本地 Vite dev server，含 React StrictMode）。
- 代码改动后请先跑 `npm run lint` 与 `npm test`（vitest），必要时 `npm run test:e2e`（Playwright，会自动启动 dev server）。
- 验证存档等涉及 localStorage 的行为时，注意 dev 模式 StrictMode 会双执行 effect（参考 src/state/gameContext.tsx 的跳过逻辑）。

## reducer 守卫原则（fail fast）

reducer 内的守卫分为两类，新增/修改动作时必须遵守：

- **不变量守卫 → 断言失败**：UI 已拦截、正常流程不可达的状态组合（战斗阶段守卫、无战斗时发战斗动作、未知物品/房间/场景引用、非出口移动、撞墙/越界、非货架购买、EXIT 未结束结算、BACK_TO_START 已在开始面板等）一律 `throw new Error(...)`，禁止静默 `return state` 掩盖调用方 bug。错误边界兜底展示。
- **资源/幂等/路由守卫 → 静默返回**：玩家资源状态或数据合法性导致的合法拒绝（金币不足、已拾取/已装备/空槽幂等、无空装备槽、USE_ITEM 在 player/battle 两个 reducer 间的路由守卫、战斗中药水数量不足、非消耗品无回复效果）保持 `return state`，不得断言——这些是用户状态可正常触发的场景。

修改 reducer 时按此分类检查，测试应相应断言 `toThrow`（不变量）或 `toBe(state)`（静默）。
