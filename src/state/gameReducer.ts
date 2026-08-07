import type { GameState, GameAction, InventoryEntry } from "../types";
import { dungeons as dungeonDefs, items as itemDefs, loot as lootDefs, rooms as roomMap } from "../data/config";
import { testBattleConfigs } from "../data/battleTestConfigs";
import { initBattle, initBattleFromEnemies, resolveTurn } from "./battleEngine";
import { generateDungeon } from "./dungeonGen";

/** 背包中的金币数量（金币为货币物品，拾取自动入账） */
export function goldAmount(player: GameState["player"]): number {
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

function addToInventory(
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

function removeFromInventory(
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

function recalcStats(player: GameState["player"]): GameState["player"] {
  const atkBonus = player.equipment.reduce(
    (sum, id) => sum + (id ? itemDefs[id]?.atk ?? 0 : 0),
    0
  );
  const defBonus = player.equipment.reduce(
    (sum, id) => sum + (id ? itemDefs[id]?.def ?? 0 : 0),
    0
  );
  const spdBonus = player.equipment.reduce(
    (sum, id) => sum + (id ? itemDefs[id]?.spd ?? 0 : 0),
    0
  );
  return {
    ...player,
    atk: 10 + atkBonus,
    def: 5 + defBonus,
    spd: 8 + spdBonus,
  };
}

export function initialPlayer(): GameState["player"] {
  return recalcStats({
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    atk: 10,
    def: 5,
    spd: 8,
    currentRoomId: "village_square",
    inventory: [
      { itemId: "gold", quantity: 20 },
      { itemId: "health_potion", quantity: 2 },
      { itemId: "apprentice_staff", quantity: 1 },
    ],
    equipment: ["rusty_sword", "rusty_shield", null, null, null, null],
    pickedItemIds: ["rusty_sword"],
  });
}

export function initialGameState(): GameState {
  return {
    screen: "start",
    player: initialPlayer(),
    battle: null,
    dungeon: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      if (state.screen === "game") return state;
      return { ...state, screen: "game" };
    }

    case "BACK_TO_START": {
      if (state.screen === "start" || state.battle) return state;
      // 保留玩家状态：测试战斗的 HP/MP 损耗在此延续
      return { ...state, screen: "start" };
    }

    case "RESET_GAME": {
      if (state.battle) return state;
      return initialGameState();
    }

    case "START_TEST_BATTLE": {
      if (state.battle) return state;
      const config = testBattleConfigs[action.scenarioId];
      if (!config) return state;
      return { ...state, battle: initBattle(action.scenarioId, state.player) };
    }

    case "BATTLE_ACT": {
      if (!state.battle) return state;
      return { ...state, battle: resolveTurn(state.battle, action.action) };
    }

    case "EXIT_BATTLE": {
      if (!state.battle) return state;
      // 地牢战斗结算
      if (state.dungeon) {
        const { player, battle, dungeon } = state;
        const room = dungeon.rooms[dungeon.playerPos.y][dungeon.playerPos.x];
        if (battle.result === "victory") {
          // 胜利：敌人清除 + 掉落入账，HP/MP 损耗保留在地牢中
          const drop = rollLoot(room.enemyIds);
          const rooms = dungeon.rooms.map((row, y) =>
            row.map((r, x) =>
              x === dungeon.playerPos.x && y === dungeon.playerPos.y
                ? { ...r, enemyIds: [] }
                : r
            )
          );
          return {
            ...state,
            player: {
              ...player,
              hp: battle.playerStats.hp,
              mp: battle.playerStats.mp,
              inventory: [
                ...player.inventory,
                ...drop.items.map((itemId) => ({ itemId, quantity: 1 })),
              ].reduce<InventoryEntry[]>((acc, e) => {
                const found = acc.find((a) => a.itemId === e.itemId);
                if (found) found.quantity += 1;
                else acc.push({ ...e });
                return acc;
              }, []),
            },
            battle: null,
            dungeon: { ...dungeon, rooms },
          };
        }
        // 败北：死亡结算——装备全丢、背包保留、地牢废弃回村庄（HP/MP 回满）
        return {
          ...state,
          player: {
            ...player,
            hp: player.maxHp,
            mp: player.maxMp,
            equipment: player.equipment.map(() => null),
          },
          battle: null,
          dungeon: null,
        };
      }
      // 测试战斗：非战斗状态 HP/MP 自动回满
      return {
        ...state,
        player: {
          ...state.player,
          hp: state.player.maxHp,
          mp: state.player.maxMp,
        },
        battle: null,
      };
    }

    case "ENTER_DUNGEON": {
      if (state.battle || state.dungeon) return state;
      if (state.player.currentRoomId !== "forest_entrance") return state;
      const def = dungeonDefs[action.dungeonId];
      if (!def) return state;
      return { ...state, dungeon: generateDungeon(def) };
    }

    case "DUNGEON_MOVE": {
      if (state.battle || !state.dungeon) return state;
      const { dungeon } = state;
      const { x, y } = dungeon.playerPos;
      const nx = x + action.dx;
      const ny = y + action.dy;
      if (nx < 0 || ny < 0 || nx >= dungeon.size.w || ny >= dungeon.size.h) return state;
      const target = dungeon.rooms[ny][nx];
      // 未探索且有敌人：不移动（由情报面板确认后 DUNGEON_ENTER_TILE）
      if (!target.explored && target.enemyIds.length > 0) return state;
      const rooms = dungeon.rooms.map((row, yy) =>
        row.map((r, xx) => (xx === nx && yy === ny ? { ...r, explored: true } : r))
      );
      return {
        ...state,
        dungeon: { ...dungeon, rooms, playerPos: { x: nx, y: ny } },
      };
    }

    case "DUNGEON_ENTER_TILE": {
      if (state.battle || !state.dungeon) return state;
      const { dungeon } = state;
      const { x, y } = dungeon.playerPos;
      if (Math.abs(action.x - x) + Math.abs(action.y - y) !== 1) return state;
      if (action.x < 0 || action.y < 0 || action.x >= dungeon.size.w || action.y >= dungeon.size.h) {
        return state;
      }
      const target = dungeon.rooms[action.y][action.x];
      if (target.explored || target.enemyIds.length === 0) return state;
      const rooms = dungeon.rooms.map((row, yy) =>
        row.map((r, xx) => (xx === action.x && yy === action.y ? { ...r, explored: true } : r))
      );
      return {
        ...state,
        dungeon: { ...dungeon, rooms, playerPos: { x: action.x, y: action.y } },
        battle: initBattleFromEnemies(target.enemyIds, state.player),
      };
    }

    case "DUNGEON_PICKUP": {
      if (state.battle || !state.dungeon) return state;
      const { dungeon } = state;
      const room = dungeon.rooms[dungeon.playerPos.y][dungeon.playerPos.x];
      if (!room.itemIds.includes(action.itemId)) return state;
      const rooms = dungeon.rooms.map((row, y) =>
        row.map((r, x) =>
          x === dungeon.playerPos.x && y === dungeon.playerPos.y
            ? { ...r, itemIds: r.itemIds.filter((id) => id !== action.itemId) }
            : r
        )
      );
      return {
        ...state,
        player: {
          ...state.player,
          inventory: addToInventory(state.player.inventory, action.itemId, 1),
        },
        dungeon: { ...dungeon, rooms },
      };
    }

    case "DUNGEON_RETREAT": {
      if (state.battle || !state.dungeon) return state;
      // 撤离：地牢废弃，回村庄，HP/MP 回满
      return {
        ...state,
        player: {
          ...state.player,
          hp: state.player.maxHp,
          mp: state.player.maxMp,
          currentRoomId: "forest_entrance",
        },
        dungeon: null,
      };
    }
    case "MOVE_ROOM": {
      if (state.battle) return state;
      const room = roomMap[state.player.currentRoomId];
      if (!room || !room.exits.includes(action.roomId)) return state;
      if (!roomMap[action.roomId]) return state;
      return {
        ...state,
        player: { ...state.player, currentRoomId: action.roomId },
      };
    }

    case "BUY_ITEM": {
      if (state.battle) return state;
      const room = roomMap[state.player.currentRoomId];
      const entry = room?.shopItems?.find((s) => s.itemId === action.itemId);
      if (!entry) return state;
      const item = itemDefs[action.itemId];
      if (!item) return state;
      const gold = goldAmount(state.player);
      if (gold < entry.price) return state;
      return {
        ...state,
        player: {
          ...state.player,
          inventory: [
            ...removeFromInventory(state.player.inventory, "gold", entry.price),
            ...addToInventory(state.player.inventory, action.itemId, 1),
          ],
        },
      };
    }

    case "PICKUP_ITEM": {
      if (state.battle) return state;
      const item = itemDefs[action.itemId];
      if (!item) return state;
      if (state.player.pickedItemIds.includes(action.itemId)) return state;
      return {
        ...state,
        player: {
          ...state.player,
          inventory: addToInventory(state.player.inventory, action.itemId, 1),
          pickedItemIds: [...state.player.pickedItemIds, action.itemId],
        },
      };
    }

    case "DISCARD_ITEM": {
      if (state.battle) return state;
      // 货币不可丢弃
      if (itemDefs[action.itemId]?.type === "currency") return state;
      return {
        ...state,
        player: {
          ...state.player,
          inventory: removeFromInventory(state.player.inventory, action.itemId, 1),
        },
      };
    }

    case "EQUIP": {
      if (state.battle) return state;
      const item = itemDefs[action.itemId];
      if (!item || item.type !== "equipment") return state;
      if (state.player.equipment.includes(action.itemId)) return state;
      const slotIndex = state.player.equipment.indexOf(null);
      if (slotIndex === -1) return state;
      const equipment = [...state.player.equipment];
      equipment[slotIndex] = action.itemId;
      const newPlayer = recalcStats({
        ...state.player,
        equipment,
        inventory: removeFromInventory(state.player.inventory, action.itemId, 1),
      });
      return { ...state, player: newPlayer };
    }

    case "UNEQUIP": {
      if (state.battle) return state;
      const itemId = state.player.equipment[action.slotIndex];
      if (!itemId) return state;
      const equipment = [...state.player.equipment];
      equipment[action.slotIndex] = null;
      const newPlayer = recalcStats({
        ...state.player,
        equipment,
        inventory: addToInventory(state.player.inventory, itemId, 1),
      });
      return { ...state, player: newPlayer };
    }

    case "USE_ITEM": {
      const item = itemDefs[action.itemId];
      if (!item) return state;
      if (item.type === "consumable") {
        if (state.battle) {
          // 战斗中使用道具：作为战斗动作生效于战斗内属性（引擎校验并结算敌方回合）
          if (!state.player.inventory.some((e) => e.itemId === action.itemId && e.quantity > 0)) {
            return state;
          }
          const battle = resolveTurn(state.battle, { kind: "useItem", itemId: action.itemId });
          if (battle === state.battle) return state;
          return {
            ...state,
            battle,
            player: {
              ...state.player,
              inventory: removeFromInventory(state.player.inventory, action.itemId, 1),
            },
          };
        }
        let newPlayer = { ...state.player };
        if (item.hpRestore) newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + item.hpRestore);
        if (item.mpRestore) newPlayer.mp = Math.min(newPlayer.maxMp, newPlayer.mp + item.mpRestore);
        newPlayer.inventory = removeFromInventory(newPlayer.inventory, action.itemId, 1);
        return { ...state, player: newPlayer };
      }
      return state;
    }

    default:
      return state;
  }
}
