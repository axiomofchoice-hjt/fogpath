export type PanelTab = "map" | "inventory";

/** 游戏屏幕：开始面板 / 主游戏（村庄与地牢） */
export type Screen = "start" | "game";

/** 双语文本：中文 + 英文 */
export interface L {
  zh: string;
  en: string;
}

// --- Items ---

export type ItemType = "equipment" | "consumable";

export const EQUIP_SLOT_COUNT = 6;

/** 装备提供的攻击动作：引用技能，自带伤害/动量（玩家本身无属性） */
export interface ItemAction {
  skillId: string;
  damage: number;
  momentum: number;
}

export interface ItemDef {
  id: string;
  name: L;
  icon: string;
  type: ItemType;
  description: L;
  rarity: number;
  atk?: number;
  def?: number;
  spd?: number;
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
  npc?: NPC;
}

// --- Player ---

export interface Player {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  lv: number;
  exp: number;
  gold: number;
  currentRoomId: string;
  inventory: InventoryEntry[];
  /** 6 个通用装备格，值为物品 ID 或 null */
  equipment: (string | null)[];
  pickedItemIds: string[];
}

// --- Game State ---

/** 战斗状态占位：战斗系统实现时填充（下一阶段） */
export interface BattleState {
  scenarioId: string;
  turn: number;
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  playerDef: number;
  /** 玩家本回合动作摘要（双语） */
  playerSummary: L;
  /** 伤害资源：对撞后减少，归零时攻击无效 */
  /** 伤害资源：对撞后减少，归零时攻击无效 */
  playerDamage: number;
  /** 本回合攻击动作的伤害满值（由所选动作决定；防御/休息回合为 0） */
  playerMaxDamage: number;
  /** 动量资源：对撞后减少，归零时伤害变灰（攻击无法命中） */
  playerMomentum: number;
  /** 本回合攻击动作的动量满值（由所选动作决定；防御/休息回合为 0） */
  playerMaxMomentum: number;
  /** 本回合动作是否带攻击属性（防御/休息/未出手时为 false，显示 0/0） */
  playerHasAttack: boolean;
  /** 装备提供的攻击动作快照（技能 + 伤害/动量） */
  playerActions: ItemAction[];
  /** 进战斗时的装备快照（供 UI 显示来源；测试场景可覆盖） */
  equipment: (string | null)[];
  /** 防御减伤比例（由装备防具决定，生锈的盾 0.5；无防具为 0） */
  guardReduction: number;
  /** 盾牌减伤是否生效（防御后持续到下一次攻击前） */
  shieldActive: boolean;
  enemies: BattleEnemy[];
  log: L[];
  result: BattleResult;
}

export type BattleResult = "ongoing" | "victory" | "defeat";

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

export interface EnemyDef {
  id: string;
  name: L;
  icon: string;
  maxHp: number;
  maxMp: number;
  damage: number;
  momentum: number;
  isBoss?: boolean;
  /** AI 策略（实现时定） */
  ai: string;
}

export interface BattleEnemy {
  defId: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  damage: number;
  maxDamage: number;
  momentum: number;
  maxMomentum: number;
  /** 本回合动作是否带攻击属性（未出手时为 false，显示 0/0） */
  hasAttack: boolean;
  isBoss: boolean;
  action: EnemyBattleAction;
  /** 上一回合动作的结果摘要（双语） */
  summary: L;
}

// --- 玩家战斗动作 ---

export type PlayerBattleAction =
  | { kind: "attack"; skillId: string; targetIndex: number }
  | { kind: "guard" }
  | { kind: "rest" };

/** 敌人本回合动作（AI 决策结果） */
export type EnemyBattleAction =
  | { kind: "attack"; skillId: string }
  | { kind: "guard" }
  | { kind: "rest" };

export interface GameState {
  screen: Screen;
  player: Player;
  battle: BattleState | null;
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
  | { type: "START_TEST_BATTLE"; scenarioId: string }
  | { type: "BATTLE_ACT"; action: PlayerBattleAction }
  | { type: "EXIT_BATTLE" }
  | { type: "PICKUP_ITEM"; itemId: string }
  | { type: "DISCARD_ITEM"; itemId: string }
  | { type: "EQUIP"; itemId: string }
  | { type: "UNEQUIP"; slotIndex: number }
  | { type: "USE_ITEM"; itemId: string }
  | { type: "REST" };
