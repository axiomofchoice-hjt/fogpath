export type PanelTab = "map" | "inventory";

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

export interface GameState {
  player: Player;
}

// --- Actions ---

export type GameAction =
  | { type: "PICKUP_ITEM"; itemId: string }
  | { type: "DISCARD_ITEM"; itemId: string }
  | { type: "EQUIP"; itemId: string }
  | { type: "UNEQUIP"; slotIndex: number }
  | { type: "USE_ITEM"; itemId: string }
  | { type: "LEARN_SKILL"; itemId: string }
  | { type: "REST" };
