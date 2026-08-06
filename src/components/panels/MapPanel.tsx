import { useGame } from "../../state/useGame";
import { rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";

function MapPanel() {
  const { state } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

  return (
    <div className="space-y-2">
      <h3 className="text-game-gold text-xs font-mono font-bold mb-2">
        {t("map.title")}
      </h3>
      <div className="bg-game-card border border-game-border rounded p-3">
        <div className="text-game-dim text-[9px] font-mono mb-1">
          {t("map.current")}
        </div>
        <div className="text-game-text text-xs font-mono">
          {room ? loc(room.name, lang) : "?"}
        </div>
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
