import { useState } from "react";
import { useGame } from "../../state/gameContext";
import { items as itemDefs } from "../../data/items";
import { skills as skillDefs } from "../../data/skills";
import { useLang } from "../../i18n/LanguageContext";
import { loc } from "../../i18n/translations";
import { EQUIP_SLOT_COUNT } from "../../types";

function ItemTooltip({ itemId }: { itemId: string }) {
  const { t, lang } = useLang();
  const item = itemDefs[itemId];
  if (!item) return null;
  return (
    <div className="fixed z-50 pointer-events-none bg-game-panel border border-game-border rounded p-3 min-w-44 shadow-lg">
      <div className="text-game-gold text-[11px] font-mono font-bold mb-1">
        {item.icon} {loc(item.name, lang)}
      </div>
      <div className="text-game-dim text-[10px] font-mono leading-relaxed mb-1.5">
        {loc(item.description, lang)}
      </div>
      {item.atk != null && (
        <div className="text-game-orange text-[10px] font-mono mt-0.5">
          {t("stat.atk")} +{item.atk}
        </div>
      )}
      {item.actions?.map((act) => {
        const skill = skillDefs[act.skillId];
        if (!skill) return null;
        return (
          <div key={act.skillId} className="text-[10px] font-mono mt-0.5 leading-relaxed">
            <span className="text-game-text">{loc(skill.name, lang)}</span>
            <span className="text-game-dim"> {t("battle.active")}，</span>
            <span className="text-game-orange">
              {t("battle.damage", { n: act.damage })}
            </span>
            <span className="text-game-dim">，</span>
            <span className="text-game-lightgreen">
              {t("battle.momentum", { n: act.momentum })}
            </span>
          </div>
        );
      })}
      {item.isShield && (
        <div className="text-[10px] font-mono mt-0.5 leading-relaxed">
          <span className="text-game-text">{t("battle.guard")}</span>
          <span className="text-game-dim"> {t("battle.active")}，</span>
          <span className="text-game-gold">{t("battle.guardEffect")}</span>
        </div>
      )}
      {item.spd != null && (
        <div className="text-game-green text-[10px] font-mono">
          {t("stat.spd")} +{item.spd}
        </div>
      )}
    </div>
  );
}

function EquipmentPanel() {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const inBattle = state.battle != null;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; itemId: string } | null>(
    null
  );

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
              onMouseMove={(e) => {
                if (item) setTooltip({ x: e.clientX, y: e.clientY, itemId: item.id });
              }}
              onMouseLeave={() => setTooltip(null)}
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
              {item && !inBattle && (
                <button
                  onClick={() => dispatch({ type: "UNEQUIP", slotIndex: i })}
                  className="text-game-red text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t("equipment.unequip")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <ItemTooltip itemId={tooltip.itemId} />
        </div>
      )}
    </div>
  );
}

export default EquipmentPanel;
