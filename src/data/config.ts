import type { EnemyDef, ItemDef, RoomDef, SkillDef } from "../types";
import enemiesJson from "../config/enemies.json";
import itemsJson from "../config/items.json";
import skillsJson from "../config/skills.json";
import roomsJson from "../config/rooms.json";
import { validateEnemies, validateItems, validateRooms, validateSkills } from "./validate";

/** 游戏配置统一入口：加载 JSON 并运行时校验，数据非法时启动即抛错 */

const skills = validateSkills(skillsJson);
const items = validateItems(itemsJson, skills);
const enemyDefs = validateEnemies(enemiesJson);
const rooms = validateRooms(roomsJson, items);

export { skills, items, enemyDefs, rooms };
export type { EnemyDef, ItemDef, RoomDef, SkillDef };
