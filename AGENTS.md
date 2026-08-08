# AGENTS.md

## 开发环境

- 用户只用 `npm run dev` 测试游戏（本地 Vite dev server，含 React StrictMode）。
- 代码改动后请先跑 `npm run lint` 与 `npm test`（vitest），必要时 `npm run test:e2e`（Playwright，会自动启动 dev server）。
- 验证存档等涉及 localStorage 的行为时，注意 dev 模式 StrictMode 会双执行 effect（参考 src/state/gameContext.tsx 的跳过逻辑）。
