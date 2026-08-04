import { useGame } from "../../state/gameContext";
import { items as itemDefs } from "../../data/items";
import { rooms as roomMap } from "../../data/rooms";
import { useLang } from "../../i18n/LanguageContext";
import { loc } from "../../i18n/translations";
import Typewriter from "./Typewriter";
import InteractCard from "./InteractCard";

function RoomView() {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

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

      <div className="space-y-3">
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

      {room.isSafeRoom && (
        <div className="mt-3">
          <button
            onClick={() => dispatch({ type: "REST" })}
            disabled={player.hp >= player.maxHp && player.mp >= player.maxMp}
            className={`px-4 py-2 rounded text-xs font-mono border transition-colors ${
              player.hp >= player.maxHp && player.mp >= player.maxMp
                ? "bg-game-card border-game-border text-game-dim cursor-not-allowed"
                : "bg-game-green/20 border-game-green/40 text-game-green hover:bg-game-green/30"
            }`}
          >
            {player.hp >= player.maxHp && player.mp >= player.maxMp
              ? t("room.restFull")
              : t("room.rest")}
          </button>
        </div>
      )}
    </main>
  );
}

export default RoomView;
