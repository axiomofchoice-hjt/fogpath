export type Language = "zh" | "en";

import type { L } from "../types";

export type Params = Record<string, string | number | L>;

/** 取本地化文本（数据字段） */
export function loc(l: L | undefined, lang: Language): string {
  if (!l) return "";
  return l[lang] ?? l.en ?? l.zh;
}

const zh = {
  "tab.map": "地图",
  "tab.inventory": "背包",

  "stat.hp": "生命",
  "stat.mp": "法力",
  "stat.atk": "攻击",
  "stat.def": "防御",
  "stat.spd": "速度",
  "stat.damage": "伤害",
  "stat.momentum": "动量",
  "stat.lv": "等级",
  "stat.exp": "经验",
  "stat.gold": "金币",
  "stat.adventurer": "冒险者",

  "itemtype.equipment": "装备",
  "itemtype.consumable": "消耗品",

  "inventory.title": "背包",
  "inventory.sort.type": "类型",
  "inventory.sort.rarity": "稀有",
  "inventory.sort.time": "时间",
  "inventory.types": "共 {{count}} 种",
  "inventory.equip": "装备",
  "inventory.use": "使用",
  "inventory.discard": "丢弃",

  "equipment.title": "装备",
  "equipment.empty": "空",
  "equipment.unequip": "卸下",
  "equipment.slot": "槽 {{n}}",

  "map.title": "地图",
  "map.current": "当前：",
  "map.area": "区域：",

  "room.safeRoom": "安全屋",
  "room.rest": "休息（恢复 HP/MP）",
  "room.restFull": "休息（HP MP 已满，无需休息）",
  "room.pickup": "拾取",
  "room.notFound": "错误：房间不存在（{{id}}）",

  "start.enterVillage": "进入村庄",
  "start.testBattles": "测试战斗",
  "start.placeholder": "规划中",

  "battle.title": "战斗",
  "battle.turn": "回合 {{n}}",
  "battle.action": "动作",
  "battle.attack": "攻击",
  "battle.guard": "防御",
  "battle.rest": "休息",
  "battle.mpCost": "法力 {{n}}",
  "battle.damage": "伤害 {{n}}",
  "battle.momentum": "动量 {{n}}",
  "battle.active": "主动",
  "battle.guardEffect": "减伤 50% 直到下一次攻击前",
  "battle.effect": "效果",
  "battle.restEffect": "回复 {{n}} 法力",
  "battle.selectTarget": "选择目标",
  "battle.cancel": "返回",
  "battle.victory": "胜利！",
  "battle.defeat": "败北…",
  "battle.exit": "返回开始面板",
} as const;

export type TKey = keyof typeof zh;

const en: Record<TKey, string> = {
  "tab.map": "Map",
  "tab.inventory": "Inventory",

  "stat.hp": "HP",
  "stat.mp": "MP",
  "stat.atk": "ATK",
  "stat.def": "DEF",
  "stat.spd": "SPD",
  "stat.damage": "DMG",
  "stat.momentum": "MOM",
  "stat.lv": "LV",
  "stat.exp": "EXP",
  "stat.gold": "Gold",
  "stat.adventurer": "Adventurer",

  "itemtype.equipment": "Equipment",
  "itemtype.consumable": "Consumable",

  "inventory.title": "Inventory",
  "inventory.sort.type": "Type",
  "inventory.sort.rarity": "Rare",
  "inventory.sort.time": "Time",
  "inventory.types": "{{count}} types",
  "inventory.equip": "Equip",
  "inventory.use": "Use",
  "inventory.discard": "Discard",

  "equipment.title": "Equipment",
  "equipment.empty": "Empty",
  "equipment.unequip": "Unequip",
  "equipment.slot": "Slot {{n}}",

  "map.title": "Map",
  "map.current": "Current: ",
  "map.area": "Area: ",

  "room.safeRoom": "Safe Room",
  "room.rest": "Rest (restore HP/MP)",
  "room.restFull": "Rest (HP/MP already full)",
  "room.pickup": "Pick up",
  "room.notFound": "Error: Room not found ({{id}})",

  "start.enterVillage": "Enter Village",
  "start.testBattles": "Test Battles",
  "start.placeholder": "Planned",

  "battle.title": "Battle",
  "battle.turn": "Turn {{n}}",
  "battle.action": "Move",
  "battle.attack": "Attack",
  "battle.guard": "Guard",
  "battle.rest": "Rest",
  "battle.mpCost": "MP {{n}}",
  "battle.damage": "Damage {{n}}",
  "battle.momentum": "Momentum {{n}}",
  "battle.active": "Active",
  "battle.guardEffect": "Reduce damage by 50% until your next attack",
  "battle.effect": "Effect",
  "battle.restEffect": "Restore {{n}} MP",
  "battle.selectTarget": "Choose Target",
  "battle.cancel": "Back",
  "battle.victory": "Victory!",
  "battle.defeat": "Defeat...",
  "battle.exit": "Back to Start",
};

export const translations: Record<Language, Record<TKey, string>> = { zh, en };
