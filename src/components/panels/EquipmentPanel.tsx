import { useGame } from "../../state/gameContext";
import { items as itemDefs } from "../../data/items";
import { useLang } from "../../i18n/LanguageContext";
import { loc } from "../../i18n/translations";
import { EQUIP_SLOT_COUNT } from "../../types";

function EquipmentPanel() {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;

  return (
    <div className="space-y-2">
      <h3 className="text-game-gold text-xs font-mono font-bold mb-2">
        {t("equipment.title")}
      </h3>
      <div className="space-y-2">
        {Array.from({ length: EQUIP_SLOT_COUNT }, (_, i) => {
          const itemId = player.equipment[i];
          const item = itemId ? itemDefs[itemId] : null;

          return (
            <div
              key={i}
              className="bg-game-card border border-game-border rounded p-3 flex items-center gap-3 group"
            >
              <span className="text-xl">{item?.icon ?? "\uD83D\uDCE6"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-game-dim text-[9px] font-mono">
                  {t("equipment.slot", { n: i + 1 })}
                </div>
                <div className="text-game-text text-[11px] font-mono truncate">
                  {item ? loc(item.name, lang) : t("equipment.empty")}
                </div>
              </div>
              {item && (
                <div className="flex flex-col items-end gap-0.5">
                  {item.atk != null && (
                    <span className="text-game-red text-[9px] font-mono">
                      {t("stat.atk")} +{item.atk}
                    </span>
                  )}
                  {item.def != null && (
                    <span className="text-game-blue text-[9px] font-mono">
                      {t("stat.def")} +{item.def}
                    </span>
                  )}
                  {item.spd != null && (
                    <span className="text-game-green text-[9px] font-mono">
                      {t("stat.spd")} +{item.spd}
                    </span>
                  )}
                  <button
                    onClick={() => dispatch({ type: "UNEQUIP", slotIndex: i })}
                    className="text-game-red text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {t("equipment.unequip")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EquipmentPanel;
