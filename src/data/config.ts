import type { DungeonDef, EnemyDef, ItemDef, LootTable, RoomDef, SkillDef } from "../types";
import enemiesJson from "../config/enemies.json";
import itemsJson from "../config/items.json";
import skillsJson from "../config/skills.json";
import roomsJson from "../config/rooms.json";
import dungeonsJson from "../config/dungeons.json";
import lootJson from "../config/loot.json";
import { validateDungeons, validateEnemies, validateItems, validateLoot, validateRooms, validateSkills } from "./validate";

/** 游戏配置统一入口：加载 JSON 并运行时校验，数据非法时启动即抛错 */

const skills = validateSkills(skillsJson);
const items = validateItems(itemsJson, skills);
const enemyDefs = validateEnemies(enemiesJson);
const rooms = validateRooms(roomsJson, items);
const dungeons = validateDungeons(dungeonsJson, enemyDefs, items);
const loot = validateLoot(lootJson, items, enemyDefs);

export { skills, items, enemyDefs, rooms, dungeons, loot };
export type { DungeonDef, EnemyDef, ItemDef, LootTable, RoomDef, SkillDef };
