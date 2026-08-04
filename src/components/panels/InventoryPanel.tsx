import { useState } from "react";
import { useGame } from "../../state/gameContext";
import { items as itemDefs } from "../../data/items";
import { useLang } from "../../i18n/LanguageContext";
import { loc } from "../../i18n/translations";

type SortMode = "type" | "time" | "rarity";

function InventoryPanel() {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const [sortMode, setSortMode] = useState<SortMode>("type");

  const inventoryItems = player.inventory
    .map((entry) => {
      const def = itemDefs[entry.itemId];
      return def ? { ...entry, def } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const sorted = [...inventoryItems].sort((a, b) => {
    if (sortMode === "type") return a.def.type.localeCompare(b.def.type);
    if (sortMode === "rarity") return b.def.rarity - a.def.rarity;
    return 0;
  });

  const canEquip = (item: (typeof sorted)[0]) => {
    return item.def.type === "equipment";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-game-gold text-xs font-mono font-bold">
          {t("inventory.title")}
        </h3>
        <div className="flex gap-1">
          {(["type", "rarity", "time"] as SortMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setSortMode(m)}
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                sortMode === m
                  ? "text-game-gold border-game-gold/40 bg-game-gold/10"
                  : "text-game-dim border-game-border hover:text-game-text"
              }`}
            >
              {m === "type"
                ? t("inventory.sort.type")
                : m === "rarity"
                ? t("inventory.sort.rarity")
                : t("inventory.sort.time")}
            </button>
          ))}
        </div>
      </div>

      {sorted.map((entry, i) => {
        const item = entry.def;
        return (
          <div
            key={item.id}
            className="bg-game-card border border-game-border rounded p-2 flex items-center gap-2 cursor-pointer hover:border-game-gold/40 transition-colors group animate-fade-in"
            style={{
              animationDelay: `${i * 50}ms`,
              animationFillMode: "backwards",
            }}
          >
            <span className="text-lg">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-game-text text-[11px] font-mono truncate">
                {loc(item.name, lang)}
              </div>
              <div className="text-game-dim text-[9px]">{loc(item.description, lang)}</div>
            </div>
            <span className="text-game-dim text-[9px] whitespace-nowrap">
              {t(`itemtype.${item.type}`)}
            </span>
            <span className="text-game-dim text-[9px] ml-1">x{entry.quantity}</span>
            {canEquip(entry) && (
              <button
                onClick={() => dispatch({ type: "EQUIP", itemId: item.id })}
                className="text-game-gold text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                title={t("inventory.equip")}
              >
                E
              </button>
            )}
            {item.type === "consumable" && (
              <button
                onClick={() => dispatch({ type: "USE_ITEM", itemId: item.id })}
                className="text-game-green text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                title={t("inventory.use")}
              >
                U
              </button>
            )}
            <button
              onClick={() => dispatch({ type: "DISCARD_ITEM", itemId: item.id })}
              className="text-game-red text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              title={t("inventory.discard")}
            >
              ✕
            </button>
          </div>
        );
      })}

      <div className="text-game-dim text-[9px] font-mono text-center pt-2 border-t border-game-border">
        {t("inventory.types", { count: player.inventory.length })}
      </div>
    </div>
  );
}

export default InventoryPanel;
