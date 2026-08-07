import type { DungeonRoom, DungeonState, InventoryEntry, Player } from "../types";
import { loot as lootDefs } from "../data/config";

/** 背包中的金币数量（金币为货币物品，拾取自动入账） */
export function goldAmount(player: Player): number {
  return player.inventory.find((e) => e.itemId === "gold")?.quantity ?? 0;
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

export function addToInventory(
  inventory: InventoryEntry[],
  itemId: string,
  qty: number
): InventoryEntry[] {
  if (qty <= 0) return inventory;
  const idx = inventory.findIndex((e) => e.itemId === itemId);
  if (idx >= 0) {
    const updated = [...inventory];
    updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
    return updated;
  }
  return [...inventory, { itemId, quantity: qty }];
}

export function removeFromInventory(
  inventory: InventoryEntry[],
  itemId: string,
  qty: number
): InventoryEntry[] {
  const idx = inventory.findIndex((e) => e.itemId === itemId);
  if (idx < 0) return inventory;
  const updated = [...inventory];
  const entry = updated[idx];
  if (entry.quantity <= qty) {
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
