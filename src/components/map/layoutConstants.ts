/** 地图方块尺寸常量（WorldMap 展开大地图 / HubMap 村庄 / DungeonGrid 地牢共用，勿在组件内另写） */

/** 展开大地图方块边长（px） */
export const TILE = 48;

/** 展开大地图方块间距（px） */
export const GAP = 4;

/** 小地图窗口半径：显示玩家周围 (2r+1)×(2r+1) = 7×7 格，玩家始终居中 */
export const MINI_RADIUS = 3;

/** 小地图空位淡块类（墙/窗口外，保持棋盘感；HubMap 与 DungeonGrid 共用） */
export const EMPTY_CELL_CLS =
  "aspect-square rounded-[3px] border border-game-border/70 bg-game-panel/60";

/** 侧栏宽度（Tailwind w-64 = 16rem；App/SidePanel 的 aside 与 ControlBar 内缩共用） */
export const SIDEBAR_W = "w-64";

/** 底部操控栏左右内缩（侧栏 16rem + 1rem 间距），与 SIDEBAR_W 配套，改动侧栏宽度须同步 */
export const CONTROL_INSET = "calc(17rem + 1rem)";
