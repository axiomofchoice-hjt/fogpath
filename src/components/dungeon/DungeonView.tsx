import { useEffect } from "react";
import type { DungeonRoom } from "../../types";
import { useGame } from "../../state/useGame";
import { dungeons as dungeonDefs, enemyDefs, items as itemDefs } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc, type Params, type TKey } from "../../i18n/translations";
import { dirFromKey, dungeonStep } from "../map/nav";
import Typewriter from "../room/Typewriter";

/** 当前房间的文字描述：类型底文 + 敌人/物品补充 */
function roomDescription(
  room: Pick<DungeonRoom, "type" | "enemyIds" | "itemIds">,
  t: (key: TKey, params?: Params) => string,
  lang: "zh" | "en"
): string {
  const parts: string[] = [];
  if (room.type === "entrance") parts.push(t("dungeon.desc.entrance"));
  else if (room.type === "boss") parts.push(t("dungeon.desc.boss"));
  else parts.push(t("dungeon.desc.room"));
  if (room.enemyIds.length > 0) {
    const names = room.enemyIds
      .map((id) => {
        const def = enemyDefs[id];
        return def ? `${def.icon} ${loc(def.name, lang)}` : id;
      })
      .join("、");
    parts.push(t("dungeon.desc.enemies", { names }));
  }
  if (room.itemIds.length > 0) parts.push(t("dungeon.desc.items"));
  return parts.join("");
}

/** 地牢视图：文字展示当前房间 + 地牢网格 + 情报面板；WASD 移动、X 撤离（GDD 4.1）
 *  pending 状态提升到 App（底部操控栏需感知情报打开以置灰） */
function DungeonView({
  mapOpen,
  pending,
  onPendingChange,
}: {
  mapOpen: boolean;
  pending: { x: number; y: number } | null;
  onPendingChange: (p: { x: number; y: number } | null) => void;
}) {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const dungeon = state.dungeon;
  const def = dungeon ? dungeonDefs[dungeon.dungeonId] : undefined;

  useEffect(() => {
    onPendingChange(null);
  }, [state.battle, onPendingChange]);

  useEffect(() => {
    if (!dungeon) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (mapOpen) return; // 展开大地图遮罩中：纯查看，不响应移动/撤离（与村庄一致）
      if (e.key.toLowerCase() === "x") {
        dispatch({ type: "DUNGEON_RETREAT" });
        return;
      }
      // 情报打开时：ENTER 确认进入、BACKSPACE 关闭
      if (pending && e.key === "Enter") {
        e.preventDefault();
        dispatch({ type: "DUNGEON_ENTER_TILE", x: pending.x, y: pending.y });
        return;
      }
      if (pending && e.key === "Backspace") {
        e.preventDefault();
        onPendingChange(null);
        return;
      }
      const dir = dirFromKey(e.key);
      if (!dir) return;
      e.preventDefault();
      const step = dungeonStep(dungeon, dir, pending);
      if (step.kind === "blocked") return;
      if (step.kind === "intel") {
        onPendingChange({ x: step.x, y: step.y });
      } else {
        dispatch({ type: "DUNGEON_MOVE", dx: step.dx, dy: step.dy });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dungeon, pending, dispatch, mapOpen, onPendingChange]);

  if (!dungeon || !def) return null;

  const { rooms, playerPos } = dungeon;
  const currentRoom = rooms[playerPos.y][playerPos.x]!;
  // 向导房间提示（教学关）：按当前房间 roomKey 查 guide.roomHints
  const guideHint = (() => {
    if (!def.guide || !currentRoom.roomKey) return null;
    const hint = def.guide.roomHints[currentRoom.roomKey];
    if (!hint) return null;
    return { name: loc(def.guide.name, lang), icon: def.guide.icon, text: loc(hint, lang) };
  })();
  const pendingRoom = pending ? rooms[pending.y][pending.x] : null;
  // 情报面板敌人：按种类聚合（同种多只显示 xN）
  const pendingEnemies = pendingRoom
    ? [...pendingRoom.enemyIds.reduce<Map<string, number>>((m, id) => {
        m.set(id, (m.get(id) ?? 0) + 1);
        return m;
      }, new Map())]
    : [];

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-game-gold text-lg font-bold font-mono">
          {def.icon} {loc(def.name, lang)} ·{" "}
          {currentRoom.type === "boss"
            ? t("dungeon.bossRoom")
            : currentRoom.type === "entrance"
              ? t("dungeon.entranceRoom")
              : t("dungeon.room")}
        </h2>
      </div>

      <Typewriter text={roomDescription(currentRoom, t, lang)} speed={20} />

      {/* 向导提示卡（教学关，复用村庄 NPC 卡片样式） */}
      {guideHint && (
        <div className="bg-game-card border border-game-blue/30 rounded p-3 mb-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{guideHint.icon}</span>
            <span className="text-game-text text-xs font-mono font-bold">{guideHint.name}</span>
          </div>
          <p className="text-game-text text-xs leading-relaxed italic">
            &ldquo;{guideHint.text}&rdquo;
          </p>
        </div>
      )}

      {/* 当前格拾取 */}
      {currentRoom.itemIds.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-game-dim text-[9px] font-mono uppercase tracking-wider">
            {t("dungeon.items", { n: currentRoom.itemIds.length })}
          </div>
          {currentRoom.itemIds.map((id) => {
            const item = itemDefs[id];
            if (!item) return null;
            return (
              <button
                key={id}
                onClick={() => dispatch({ type: "DUNGEON_PICKUP", itemId: id })}
                className="w-full max-w-md text-left px-4 py-2 rounded border border-game-gold/40 bg-game-gold/10 text-game-text text-xs font-mono hover:bg-game-gold/20 transition-colors flex items-center gap-3"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{loc(item.name, lang)}</span>
                <span className="ml-auto text-game-gold text-[10px]">{t("dungeon.pickup")}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 地牢网格在右栏小地图显示，主界面纯文字 */}

      {/* 情报卡片（GDD 4.1）：进入未探索有敌人的房间前；内联卡片，确认/关闭在卡片与底部操控栏均可 */}
      {pending && pendingRoom && (
        <div className="bg-game-card border border-game-gold/40 rounded p-4 mt-4 animate-fade-in">
          <h3 className="text-game-gold text-sm font-mono font-bold mb-2">{t("dungeon.intel")}</h3>
          <div className="text-game-text text-xs font-mono mb-2">
            {pendingRoom.type === "boss" ? t("dungeon.bossRoom") : t("dungeon.room")}
          </div>
          <div className="space-y-1 mb-3">
            {pendingEnemies.map(([id, count]) => {
              const def = enemyDefs[id];
              if (!def) return null;
              return (
                <div key={id} className="flex items-center gap-2 text-game-text text-xs font-mono">
                  <span>{def.icon}</span>
                  <span>{loc(def.name, lang)}</span>
                  <span className="text-game-dim">x{count}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                dispatch({ type: "DUNGEON_ENTER_TILE", x: pending.x, y: pending.y });
              }}
              className="px-4 py-1.5 rounded text-xs font-mono border border-game-gold/50 bg-game-gold/20 text-game-gold hover:bg-game-gold/30 transition-colors"
            >
              {t("dungeon.enterRoom")}
            </button>
            <button
              onClick={() => onPendingChange(null)}
              className="px-4 py-1.5 rounded text-xs font-mono border border-game-border text-game-dim hover:text-game-text hover:border-game-gold/40 transition-colors"
            >
              {t("dungeon.cancel")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default DungeonView;
