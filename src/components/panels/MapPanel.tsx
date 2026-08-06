import { useGame } from "../../state/useGame";
import { rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import HubMap from "../map/HubMap";

function MapPanel({ onExpand }: { onExpand: () => void }) {
  const { state } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-game-gold text-xs font-mono font-bold">{t("map.minimap")}</h3>
        <button
          onClick={onExpand}
          className="text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        >
          {t("map.expand")}
        </button>
      </div>
      <div className="bg-game-card border border-game-border rounded p-3">
        <div className="text-game-dim text-[9px] font-mono mb-1">
          {t("map.current")}
          <span className="text-game-text">{room ? loc(room.name, lang) : "?"}</span>
        </div>
        <HubMap currentRoomId={player.currentRoomId} />
        {room && (
          <div className="text-game-dim text-[10px] font-mono mt-1">
            {t("map.area")}
            {loc(room.area, lang)}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPanel;
