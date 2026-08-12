# AGENTS.md

## 开发环境

- 用户只用 `npm run dev` 测试游戏（本地 Vite dev server，含 React StrictMode）。
- 代码改动后请先跑 `npm run lint` 与 `npm test`（vitest），必要时 `npm run test:e2e`（Playwright，会自动启动 dev server）。
- 验证存档等涉及 localStorage 的行为时，注意 dev 模式 StrictMode 会双执行 effect（参考 src/state/gameContext.tsx 的跳过逻辑）。

## 工程哲学：fail fast

默认 fail fast：无法履约的操作、不可达的状态组合、非法引用一律尽早 `throw`，禁止静默吞掉错误；错误边界兜底展示。静默只作为例外存在，且必须注释标注分类。

- **不用和类型（Result）表达合法拒绝**：TypeScript 没有强制 no-discard（`#[must_use]` 类注解），`foo();` 可直接丢弃 `{ok:false}` 返回值，约束力不如 `throw`。合法拒绝用「谓词守卫（如 `canRemoveFromInventory`）＋ 严格执行器（无法履约即断言失败）」，调用方 bug 一律 `throw`。

## 随机性约定：reducer 必须纯函数

- 含随机的动作（ENTER_DUNGEON / DUNGEON_ENTER_TILE / START_TEST_BATTLE / BATTLE_ACT / USE_ITEM / EXIT_BATTLE）一律携带 `seed: number`，reducer 内以 `mulberry32(seed)`（src/state/rng.ts）为随机源；派发层用 `randomSeed()` 生成。
- 禁止在 reducer 内直接调 `Math.random`：StrictMode 双执行会产出不一致状态。新增含随机逻辑的动作必须遵循此约定。
