import type { DungeonRoom, DungeonState, InventoryEntry, Player } from "../types";
import { loot as lootDefs } from "../data/config";

/** 背包精灵物品 ID（营地入口拾取；回村即消散） */
export const PACK_SPIRIT_ID = "bag_spirit";

/** 背包中的金币数量（金币为货币物品，拾取自动入账） */
export function goldAmount(player: Player): number {
  return player.inventory.find((e) => e.itemId === "gold")?.quantity ?? 0;
}

/** 不变量守卫：条件为假时断言失败（fail fast）。UI 已拦截、正常流程不可达的状态组合属调用方 bug，禁止静默掩盖 */
export function assertInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** 掉落结算（GDD 6）：逐条滚概率，金币随机范围入账 */
export function rollLoot(
  enemyIds: string[],
  rng: () => number = Math.random
): { items: string[]; gold: number } {
  const items: string[] = [];
  let gold = 0;
  for (const id of enemyIds) {
    const table = lootDefs[id];
    if (!table) continue;
    for (const entry of table.items) {
      if (rng() < entry.chance) items.push(entry.itemId);
    }
    const [min, max] = table.gold;
    gold += min + Math.floor(rng() * (max - min + 1));
  }
  return { items, gold };
}

/** 可以执行检查：背包中该物品数量是否足够（qty 必须为正）。调用方用 if 守卫后再执行 */
export function canRemoveFromInventory(
  inventory: InventoryEntry[],
  itemId: string,
  qty: number
): boolean {
  return qty > 0 && inventory.some((e) => e.itemId === itemId && e.quantity >= qty);
}

/** 执行：追加 qty 个（合并或新增条目）。qty 非正一律断言失败，不静默 */
export function addToInventory(
  inventory: InventoryEntry[],
  itemId: string,
  qty: number
): InventoryEntry[] {
  assertInvariant(qty > 0, "addToInventory: 数量必须为正");
  const idx = inventory.findIndex((e) => e.itemId === itemId);
  if (idx >= 0) {
    const updated = [...inventory];
    updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
    return updated;
  }
  return [...inventory, { itemId, quantity: qty }];
}

/** 执行：移除 qty 个。函数只履约不静默——qty 非正/条目缺失/数量不足一律断言失败，
 *  合法拒绝由调用方以 canRemoveFromInventory 守卫，不得下沉到本函数吞掉 */
export function removeFromInventory(
  inventory: InventoryEntry[],
  itemId: string,
  qty: number
): InventoryEntry[] {
  assertInvariant(qty > 0, "removeFromInventory: 数量必须为正");
  const idx = inventory.findIndex((e) => e.itemId === itemId);
  assertInvariant(idx >= 0, `removeFromInventory: 背包中没有 ${itemId}`);
  const updated = [...inventory];
  const entry = updated[idx];
  assertInvariant(
    entry.quantity >= qty,
    `removeFromInventory: ${itemId} 数量不足（需 ${qty}，现有 ${entry.quantity}）`
  );
  if (entry.quantity === qty) {
    updated.splice(idx, 1);
  } else {
    updated[idx] = { ...entry, quantity: entry.quantity - qty };
  }
  return updated;
}

/** 不可变更新单个房间（其余格原样保留） */
export function patchRoom(
  dungeon: DungeonState,
  x: number,
  y: number,
  patch: Partial<DungeonRoom>
): DungeonState["rooms"] {
  return dungeon.rooms.map((row, yy) =>
    row.map((r, xx) => (xx === x && yy === y ? { ...r!, ...patch } : r))
  );
}

/** 回村消散：移除背包精灵并复位 hasPet（未持有精灵时幂等，不断言） */
export function stripPackSpirit(player: Player): Player {
  const inventory = canRemoveFromInventory(player.inventory, PACK_SPIRIT_ID, 1)
    ? removeFromInventory(player.inventory, PACK_SPIRIT_ID, 1)
    : player.inventory;
  return { ...player, hasPet: false, inventory };
}
