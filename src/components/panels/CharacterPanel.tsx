import { useGame } from "../../state/gameContext";
import { useLang } from "../../i18n/LanguageContext";

function CharacterPanel() {
  const { state } = useGame();
  const { t } = useLang();
  const { player } = state;
  const battle = state.battle;

  const hp = battle ? battle.playerHp : player.hp;
  const maxHp = battle ? battle.playerMaxHp : player.maxHp;
  const mp = battle ? battle.playerMp : player.mp;
  const maxMp = battle ? battle.playerMaxMp : player.maxMp;
  const atk = battle ? battle.playerAtk : player.atk;
  const def = battle ? battle.playerDef : player.def;

  const expNeeded = player.lv * 100;
  const hpPct = Math.max(0, (hp / maxHp) * 100);
  const mpPct = Math.max(0, (mp / maxMp) * 100);

  const stats = [
    { label: t("stat.atk"), value: `${atk}`, color: "text-game-red" },
    { label: t("stat.def"), value: `${def}`, color: "text-game-blue" },
    { label: t("stat.spd"), value: `${player.spd}`, color: "text-game-green" },
    { label: t("stat.lv"), value: `${player.lv}`, color: "text-game-purple" },
    { label: t("stat.exp"), value: `${player.exp} / ${expNeeded}`, color: "text-game-dim" },
    { label: t("stat.gold"), value: `${player.gold}`, color: "text-game-gold" },
  ];

  return (
    <div className="space-y-2">
      <div className="text-game-text text-sm font-mono mb-3 text-center">
        {t("stat.adventurer")}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px] font-mono">
          <span className="text-game-red">{t("stat.hp")}</span>
          <span className="text-game-text">
            {hp}/{maxHp}
          </span>
        </div>
        <div className="h-3 bg-game-bg rounded-full overflow-hidden border border-game-border">
          <div
            className="h-full bg-game-red rounded-full transition-all duration-300"
            style={{ width: `${hpPct}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] font-mono mt-2">
          <span className="text-game-blue">{t("stat.mp")}</span>
          <span className="text-game-text">
            {mp}/{maxMp}
          </span>
        </div>
        <div className="h-3 bg-game-bg rounded-full overflow-hidden border border-game-border">
          <div
            className="h-full bg-game-blue rounded-full transition-all duration-300"
            style={{ width: `${mpPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 mt-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex justify-between items-center bg-game-card border border-game-border rounded px-2 py-1.5"
          >
            <span className="text-game-dim text-[10px] font-mono">{s.label}</span>
            <span className={`text-[10px] font-mono ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CharacterPanel;
