import { useEffect, useState } from "react";
import { dungeons as dungeonDefs } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";

/** 地牢选择弹窗：WASD/方向键 + Enter 进入（GDD 3.2，当前仅森林，进入提示规划中） */
function DungeonSelect({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLang();
  const list = Object.values(dungeonDefs);
  const [cursor, setCursor] = useState(0);
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCursor(0);
      setChosenId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (chosenId) setChosenId(null);
        else onClose();
        return;
      }
      if (chosenId) return;
      if (e.key.toLowerCase() === "w" || e.key === "ArrowUp") {
        setCursor((c) => (c - 1 + list.length) % list.length);
      } else if (e.key.toLowerCase() === "s" || e.key === "ArrowDown") {
        setCursor((c) => (c + 1) % list.length);
      } else if (e.key === "Enter") {
        setChosenId(list[cursor].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, cursor, list, chosenId, onClose]);

  if (!open) return null;

  const chosen = list.find((d) => d.id === chosenId);

  return (
    <div className="fixed inset-0 z-50 bg-game-bg/95 flex flex-col items-center justify-center gap-5">
      <h2 className="text-game-gold text-lg font-mono font-bold">{t("dungeon.title")}</h2>
      <div className="w-80 space-y-2">
        {list.map((d, i) => (
          <button
            key={d.id}
            className={`w-full text-left px-4 py-3 rounded border font-mono transition-colors ${
              i === cursor
                ? "bg-game-gold/20 border-game-gold text-game-text"
                : "bg-game-card border-game-border text-game-text hover:border-game-gold/40"
            }`}
            onMouseEnter={() => setCursor(i)}
            onClick={() => setChosenId(d.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{d.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{loc(d.name, lang)}</div>
                <div className="text-game-dim text-[10px]">{loc(d.description, lang)}</div>
              </div>
              <span className="text-game-dim text-[10px] flex-shrink-0">
                {t("dungeon.difficulty", { n: d.difficulty })}
              </span>
            </div>
          </button>
        ))}
      </div>
      {chosen ? (
        <div className="text-game-gold text-xs font-mono animate-fade-in">
          {t("dungeon.planned", { name: loc(chosen.name, lang) })}
        </div>
      ) : (
        <p className="text-game-dim text-[10px] font-mono">
          W/S 选择 · Enter 进入 · Esc {t("dungeon.back")}
        </p>
      )}
    </div>
  );
}

export default DungeonSelect;
