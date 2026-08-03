export type PanelTab = "map" | "inventory";

/** 游戏屏幕：开始面板 / 主游戏（村庄与地牢） */
export type Screen = "start" | "game";

/** 双语文本：中文 + 英文 */
export interface L {
  zh: string;
  en: string;
}

// --- Items ---

export type ItemType = "equipment" | "consumable" | "skill";

export const EQUIP_SLOT_COUNT = 6;

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
  skillId?: string;
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
  learnedSkillIds: string[];
  pickedItemIds: string[];
}

// --- Game State ---

/** 战斗状态占位：战斗系统实现时填充（下一阶段） */
export interface BattleState {
  scenarioId: string;
}

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
  | { type: "PICKUP_ITEM"; itemId: string }
  | { type: "DISCARD_ITEM"; itemId: string }
  | { type: "EQUIP"; itemId: string }
  | { type: "UNEQUIP"; slotIndex: number }
  | { type: "USE_ITEM"; itemId: string }
  | { type: "LEARN_SKILL"; itemId: string }
  | { type: "REST" };
