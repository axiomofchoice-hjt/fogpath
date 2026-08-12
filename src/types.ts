export type PanelTab = "map" | "inventory";

/** 游戏屏幕：开始面板 / 主游戏（村庄与地牢） */
export type Screen = "start" | "game";

/** 双语文本：中文 + 英文 */
export interface L {
  zh: string;
  en: string;
}

/** 战斗日志条目分类（着色/排版用，不依赖文案内容） */
export type LogKind = "turn" | "victory" | "defeat" | "info";

/** 战斗日志条目：双语文本 + 分类 */
export type LogEntry = L & { kind: LogKind };

// --- Items ---

export type ItemType = "equipment" | "consumable" | "currency" | "pet";

export const EQUIP_SLOT_COUNT = 6;

/** 装备提供的攻击动作：引用技能，自带伤害（玩家本身无属性） */
export interface ItemAction {
  skillId: string;
  damage: number;
}

export interface ItemDef {
  id: string;
  name: L;
  icon: string;
  type: ItemType;
  description: L;
  rarity: number;
  hpRestore?: number;
  mpRestore?: number;
  /** 盾牌：赋予防御动作（举盾减伤） */
  isShield?: boolean;
  /** 武器/魔法书/法杖提供的攻击动作（一件可多个） */
  actions?: ItemAction[];
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

// --- Rooms ---

export interface NPC {
  name: L;
  icon: string;
  dialogue: L[];
}

export interface RoomDef {
  id: string;
  name: L;
  description: L;
  area: L;
  isSafeRoom: boolean;
  itemIds: string[];
  /** 相邻房间（出口），村庄/WASD 节点导航依赖 */
  exits: string[];
  /** 节点在地图上的位置（小地图/大地图渲染） */
  pos: { x: number; y: number };
  npc?: NPC;
  /** 商店货架：物品 + 价格（金币） */
  shopItems?: { itemId: string; price: number }[];
  /** 地牢入口：该房间可进入的 DungeonDef.id（通用进图按钮） */
  dungeonId?: string;
}

/** 静态布局中的房间定义（layout 模式：房间键 → 规格） */
export interface DungeonRoomSpec {
  type: DungeonRoomType;
  enemyIds: string[];
  itemIds: string[];
}

/** 引导 NPC（教学关）：单句提示，房间内与战斗中显示 */
export interface DungeonGuide {
  icon: string;
  name: L;
  /** 房间提示：按布局房间键（进入房间时显示） */
  roomHints: Record<string, L>;
  /** 战斗提示：按布局房间键（战斗中显示在怪物卡上方） */
  battleHints: Record<string, L>;
}

/** 地牢入口（地图入口，GDD 3.2）：从村庄选择后进入 */
export interface DungeonDef {
  id: string;
  name: L;
  icon: string;
  description: L;
  /** 难度范围（GDD 3.2，如森林 1-3） */
  difficulty: number;
  /** 静态手编布局：有则按布局构建（无随机），无则走随机生成 */
  layout?: string[][];
  /** 布局房间定义（layout 模式必需，键与 layout 单元格对应） */
  rooms?: Record<string, DungeonRoomSpec>;
  /** 引导 NPC 配置（教学关） */
  guide?: DungeonGuide;
  /** 地牢网格边界（随机生成模式必需） */
  size?: { w: number; h: number };
  /** 目标房间数（随机生成模式必需） */
  roomCount?: number;
  /** 敌人池：按归一化深度（0-10）区间分布（随机生成模式必需） */
  enemyPool?: { enemyId: string; minDepth: number; maxDepth: number; weight: number }[];
  /** 普通房物品池（随机生成模式必需） */
  itemPool?: string[];
  /** Boss 敌人 ID（Boss 房位于最深处） */
  bossId: string;
}

/** 掉落条目：物品 + 掉率（GDD 6） */
export interface LootEntry {
  itemId: string;
  chance: number;
}

/** 掉落表：按敌人 ID 索引；items 每次掉落独立判定，gold 为随机范围 */
export interface LootTable {
  items: LootEntry[];
  gold: [number, number];
}

// --- 地牢状态 ---

export type DungeonRoomType = "entrance" | "normal" | "boss";

export interface DungeonRoom {
  type: DungeonRoomType;
  /** 已探索（未探索显示迷雾） */
  explored: boolean;
  /** 距入口的最短步数（BFS 距离；内容分布与测试用） */
  depth: number;
  /** 房间敌人（战斗胜利后清空） */
  enemyIds: string[];
  /** 房间物品（拾取后移除） */
  itemIds: string[];
  /** 静态布局的房间键（layout 模式；向导提示按此查） */
  roomKey?: string;
}

export interface DungeonState {
  dungeonId: string;
  size: { w: number; h: number };
  /** 方格地图：null = 墙（无房间，不可通行） */
  rooms: (DungeonRoom | null)[][];
  playerPos: { x: number; y: number };
}

// --- Player ---

export interface Player {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  currentRoomId: string;
  inventory: InventoryEntry[];
  /** 6 个通用装备格，值为物品 ID 或 null */
  equipment: (string | null)[];
  pickedItemIds: string[];
  /** 是否持有背包精灵（死亡时背包运回村庄；回村即消散，GDD 2.6.4） */
  hasPet: boolean;
}

// --- Game State ---

/** 战斗单位的属性槽（玩家与敌人同形；伤害每回合重置） */
export interface CombatStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** 本回合攻击动作的伤害值（由所选动作决定；防御/休息回合为 0，被格挡显示 0） */
  damage: number;
  /** 本回合攻击动作的伤害满值（由所选动作决定；防御/休息回合为 0） */
  maxDamage: number;
  /** 本回合动作是否带攻击属性（防御/休息/未出手时为 false，显示 0） */
  hasAttack: boolean;
}

/** 战斗状态占位：战斗系统实现时填充（下一阶段） */
export interface BattleState {
  scenarioId: string;
  turn: number;
  /** 玩家属性槽（HP/MP/伤害） */
  playerStats: CombatStats;
  /** 玩家本回合动作摘要（双语） */
  playerSummary: L;
  /** 装备提供的攻击动作快照（技能 + 伤害） */
  playerActions: ItemAction[];
  /** 进战斗时的装备快照（供 UI 显示来源；测试场景可覆盖） */
  equipment: (string | null)[];
  /** 防御减伤比例（由装备防具决定，生锈的盾 0.5；无防具为 0） */
  guardReduction: number;
  /** 盾牌减伤是否生效（防御后持续到下一次攻击前） */
  shieldActive: boolean;
  enemies: BattleEnemy[];
  log: LogEntry[];
  result: BattleResult;
}

export type BattleResult = "ongoing" | "victory" | "defeat";

// --- 状态（战斗中可叠加多个：举盾、中毒等） ---

export type StatusId = "guard";

// --- 技能 ---

export type SkillType = "physical" | "magic";

export interface SkillDef {
  id: string;
  name: L;
  icon: string;
  type: SkillType;
  mpCost: number;
}

// --- 敌人 ---

/** 模式步：蓄力回合（不攻击）或攻击步（蓄力技，显式数值） */
export type PatternStep =
  | { kind: "charge" }
  | { kind: "attack"; name: L; damage: number };

/** 敌人攻击模式：固定动作序列，模式内部完全确定（GDD 2.4.9） */
export interface AttackPattern {
  id: string;
  /** 模式池权重：模式完成后随机选取，刚完成的权重降低（防重复） */
  weight: number;
  steps: PatternStep[];
}

/** 敌人展示动作集：一个动作项（如「蓄力→重击」= 1 格蓄力 + 攻击） */
export interface EnemyMove {
  name: L;
  /** 前置蓄力格数（0 = 直接攻击） */
  charge: number;
}

export interface EnemyDef {
  id: string;
  name: L;
  icon: string;
  maxHp: number;
  maxMp: number;
  damage: number;
  /** Boss 标记（Boss 房、掉落表区分；强化模板见 GDD 2.4.6） */
  isBoss?: boolean;
  /** 玩家可见动作集（战斗卡片显示；所有哥布林变种统一以掩盖类型差异） */
  moves?: EnemyMove[];
  /** 攻击模式池（固定序列，随机选取） */
  patterns: AttackPattern[];
}

export interface BattleEnemy {
  defId: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  damage: number;
  maxDamage: number;
  /** 本回合动作是否带攻击属性（蓄力/未出手时为 false，显示 0） */
  hasAttack: boolean;
  /** Boss 标记（战斗界面显示徽标） */
  isBoss: boolean;
  /** 当前模式与步骤 */
  pattern: { patternId: string; stepIndex: number };
  /** 上一回合完成的模式 ID（防重复权重惩罚用） */
  lastPatternId: string | null;
  /** 上一回合动作的结果摘要（双语） */
  summary: L;
}

// --- 玩家战斗动作 ---

export type PlayerBattleAction =
  | { kind: "attack"; skillId: string; targetIndex: number }
  | { kind: "guard" }
  | { kind: "useItem"; itemId: string }
  | { kind: "rest" };

export interface GameState {
  screen: Screen;
  player: Player;
  battle: BattleState | null;
  /** 当前地牢（村庄为 null；撤离/死亡后废弃） */
  dungeon: DungeonState | null;
}

// --- 测试场景 ---

export interface TestScenarioDef {
  id: string;
  name: L;
  description: L;
}

export interface TestScenarioGroup {
  id: string;
  name: L;
  scenarios: TestScenarioDef[];
}

// --- Actions ---

export type GameAction =
  | { type: "START_GAME" }
  | { type: "BACK_TO_START" }
  | { type: "RESET_GAME" }
  | { type: "LOAD_SAVE"; save: GameState }
  | { type: "START_TEST_BATTLE"; scenarioId: string }
  | { type: "BATTLE_ACT"; action: PlayerBattleAction }
  | { type: "EXIT_BATTLE" }
  | { type: "ENTER_DUNGEON"; dungeonId: string }
  | { type: "DUNGEON_MOVE"; dx: number; dy: number }
  | { type: "DUNGEON_ENTER_TILE"; x: number; y: number }
  | { type: "DUNGEON_PICKUP"; itemId: string }
  | { type: "DUNGEON_RETREAT" }
  | { type: "MOVE_ROOM"; roomId: string }
  | { type: "BUY_ITEM"; itemId: string }
  | { type: "PICKUP_ITEM"; itemId: string }
  | { type: "DISCARD_ITEM"; itemId: string }
  | { type: "EQUIP"; itemId: string }
  | { type: "UNEQUIP"; slotIndex: number }
  | { type: "USE_ITEM"; itemId: string };
