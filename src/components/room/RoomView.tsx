import { useEffect } from "react";
import { useGame } from "../../state/useGame";
import { goldAmount } from "../../state/gameReducer";
import { items as itemDefs, rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import Typewriter from "./Typewriter";
import InteractCard from "./InteractCard";
import { dirFromKey, nearestInDir } from "../map/nav";

/** 出口方向箭头（按节点坐标差） */
function exitArrow(fromX: number, fromY: number, toX: number, toY: number): string {
  if (toX > fromX) return "\u2192"; // →
  if (toX < fromX) return "\u2190"; // ←
  if (toY > fromY) return "\u2193"; // ↓
  return "\u2191"; // ↑
}

function RoomView({ mapOpen }: { mapOpen: boolean }) {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

  // 村庄 WASD 移动：朝方向最近的出口移动（大地图打开时不接管）
  useEffect(() => {
    if (state.battle || mapOpen || !room) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const dir = dirFromKey(e.key);
      if (!dir) return;
      e.preventDefault();
      const next = nearestInDir(room.id, dir);
      if (next && room.exits.includes(next)) {
        dispatch({ type: "MOVE_ROOM", roomId: next });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.battle, mapOpen, room, dispatch]);

  if (!room) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <p className="text-game-red text-sm font-mono">
          {t("room.notFound", { id: player.currentRoomId })}
        </p>
      </main>
    );
  }

  const roomItems = room.itemIds
    .filter((id) => !player.pickedItemIds.includes(id))
    .map((id) => itemDefs[id])
    .filter(Boolean);

  const gold = goldAmount(player);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-game-gold text-lg font-bold font-mono">
          {loc(room.name, lang)}
        </h2>
        {room.isSafeRoom && (
          <span className="text-game-green text-[10px] font-mono bg-game-green/10 px-2 py-0.5 rounded border border-game-green/30">
            {t("room.safeRoom")}
          </span>
        )}
      </div>

      <Typewriter text={loc(room.description, lang)} speed={25} />

      {room.npc && (
        <div className="bg-game-card border border-game-blue/30 rounded p-3 mb-3 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{room.npc.icon}</span>
            <span className="text-game-text text-sm font-mono">
              {loc(room.npc.name, lang)}
            </span>
          </div>
          <p className="text-game-text text-xs leading-relaxed italic">
            &ldquo;{loc(room.npc.dialogue[0], lang)}&rdquo;
          </p>
        </div>
      )}

      {/* 出口：WASD 移动 / 点击进入 */}
      {room.exits.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-game-dim text-[9px] font-mono uppercase tracking-wider">
            {t("room.exits")} · WASD
          </div>
          {room.exits.map((rid) => {
            const target = roomMap[rid];
            if (!target) return null;
            return (
              <button
                key={rid}
                onClick={() => dispatch({ type: "MOVE_ROOM", roomId: rid })}
                className="w-full text-left px-4 py-2 rounded border border-game-border bg-game-card text-game-text text-xs font-mono hover:border-game-gold/40 transition-colors flex items-center gap-3 group"
              >
                <span className="text-game-dim group-hover:text-game-gold transition-colors">
                  {exitArrow(room.pos.x, room.pos.y, target.pos.x, target.pos.y)}
                </span>
                <span>{loc(target.name, lang)}</span>
                <span className="ml-auto text-game-dim text-[10px]">{t("room.enter")}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3 mt-3">
        {roomItems.map((item) => (
          <div key={item.id}>
            <InteractCard
              icon={item.icon}
              name={loc(item.name, lang)}
              sub={loc(item.description, lang)}
              actionLabel={t("room.pickup")}
              onClick={() => dispatch({ type: "PICKUP_ITEM", itemId: item.id })}
            />
          </div>
        ))}
      </div>

      {/* 商店 */}
      {room.shopItems && (
        <div className="bg-game-card border border-game-gold/30 rounded p-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-game-gold text-xs font-mono font-bold">{t("shop.title")}</span>
            <span className="text-game-gold text-xs font-mono">
              {t("shop.gold", { n: gold })}
            </span>
          </div>
          <div className="space-y-2">
            {room.shopItems.map((s) => {
              const item = itemDefs[s.itemId];
              if (!item) return null;
              const afford = gold >= s.price;
              return (
                <div
                  key={s.itemId}
                  className="flex items-center gap-3 px-3 py-2 rounded border border-game-border"
                >
                  <span className="text-xl">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-game-text text-xs font-mono">{loc(item.name, lang)}</div>
                    <div className="text-game-dim text-[10px]">{loc(item.description, lang)}</div>
                  </div>
                  <span className="text-game-gold text-xs font-mono flex-shrink-0">
                    {t("shop.price", { n: s.price })}
                  </span>
                  <button
                    onClick={() => dispatch({ type: "BUY_ITEM", itemId: s.itemId })}
                    disabled={!afford}
                    className={`px-3 py-1 rounded text-[10px] font-mono border flex-shrink-0 transition-colors ${
                      afford
                        ? "bg-game-gold/20 border-game-gold/50 text-game-gold hover:bg-game-gold/30"
                        : "bg-game-card border-game-border text-game-dim cursor-not-allowed"
                    }`}
                  >
                    {afford ? t("shop.buy") : t("shop.insufficient")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {room.id === "forest_entrance" && (
        <div className="mt-3">
          <button
            onClick={() => dispatch({ type: "ENTER_DUNGEON", dungeonId: "forest" })}
            className="px-4 py-2 rounded text-xs font-mono border border-game-gold/40 bg-game-gold/10 text-game-gold hover:bg-game-gold/20 transition-colors"
          >
            {t("room.enterForest")}
          </button>
        </div>
      )}
    </main>
  );
}

export default RoomView;
