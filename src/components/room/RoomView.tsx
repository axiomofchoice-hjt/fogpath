import { useEffect, useState } from "react";
import { useGame } from "../../state/useGame";
import { goldAmount } from "../../state/helpers";
import { loadSaveInfo } from "../../state/save";
import { items as itemDefs, rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import Typewriter from "./Typewriter";
import InteractCard from "./InteractCard";
import { dirFromKey } from "../map/nav";
import { controlEnter, controlMoveDir } from "../control/controlActions";
import { randomSeed } from "../../state/rng";
import { GoldWideButton } from "../ui/buttons";

function RoomView({ mapOpen }: { mapOpen: boolean }) {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // 自动存档时间：进入安全屋时读取（自动存档发生在 gameContext effect）
  useEffect(() => {
    if (!room?.isSafeRoom) return;
    setSavedAt(loadSaveInfo()?.savedAt ?? null);
  }, [room?.isSafeRoom]);

  // 村庄 WASD 移动：朝方向最近的出口移动（大地图打开时不接管）
  useEffect(() => {
    if (state.battle || mapOpen || !room) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // ENTER：房间有地牢入口时进入地牢（操控栏「↵」同源）
      if (e.key === "Enter" && room.dungeonId) {
        e.preventDefault();
        controlEnter(state, null, dispatch);
        return;
      }
      const dir = dirFromKey(e.key);
      if (!dir) return;
      e.preventDefault();
      controlMoveDir(state, dir, null, dispatch);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.battle, mapOpen, room, state, dispatch]);

  if (!room) {
    // 兜底例外（与 fail-fast 不冲突的显式分类）：坏存档/未知房间引用给出可见错误文案而非崩溃
    // （数据进入前已被 isGameState 深度校验拦截，此处仅防极端的运行时引用变化）
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
        {room.isSafeRoom && (
          <div className="ml-auto flex items-center gap-2">
            {savedAt !== null && (
              <span className="text-game-dim text-[10px] font-mono">
                {t("save.savedAt", {
                  time: new Date(savedAt).toLocaleTimeString(
                    lang === "zh" ? "zh-CN" : "en-US",
                    { hour12: false }
                  ),
                })}
              </span>
            )}
          </div>
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
          <p className="text-game-text text-xs leading-relaxed">
            &ldquo;{loc(room.npc.dialogue[0], lang)}&rdquo;
          </p>
        </div>
      )}

      {/* 出口卡片已移除：村庄移动走小地图点击与底部操控栏（WASD） */}

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

      {room.dungeonId && (
        <div className="mt-3">
          <GoldWideButton
            onClick={() =>
              dispatch({ type: "ENTER_DUNGEON", dungeonId: room.dungeonId!, seed: randomSeed() })
            }
          >
            {t("room.enterDungeon")}
          </GoldWideButton>
        </div>
      )}
    </main>
  );
}

export default RoomView;
