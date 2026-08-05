import { useGame } from "../../state/useGame";
import { useLang } from "../../i18n/useLang";

function CharacterPanel() {
  const { state } = useGame();
  const { t } = useLang();
  const { player } = state;
  const battle = state.battle;

  const hp = battle ? battle.playerStats.hp : player.hp;
  const maxHp = battle ? battle.playerStats.maxHp : player.maxHp;
  const mp = battle ? battle.playerStats.mp : player.mp;
  const maxMp = battle ? battle.playerStats.maxMp : player.maxMp;

  const hpPct = Math.max(0, (hp / maxHp) * 100);
  const mpPct = Math.max(0, (mp / maxMp) * 100);

  return (
    <div className="space-y-2">
      <div className="text-game-text text-sm font-mono mb-3 text-center">
        {t("stat.adventurer")}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-game-red text-[11px] font-mono">{t("stat.hp")}</span>
          <div className="h-1.5 flex-1 bg-game-bg rounded-full overflow-hidden border border-game-border">
            <div
              className="h-full bg-game-red rounded-full transition-all duration-300"
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="text-game-text text-[11px] font-mono">{hp}/{maxHp}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-game-blue text-[11px] font-mono">{t("stat.mp")}</span>
          <div className="h-1.5 flex-1 bg-game-bg rounded-full overflow-hidden border border-game-border">
            <div
              className="h-full bg-game-blue rounded-full transition-all duration-300"
              style={{ width: `${mpPct}%` }}
            />
          </div>
          <span className="text-game-text text-[11px] font-mono">{mp}/{maxMp}</span>
        </div>
      </div>
    </div>
  );
}

export default CharacterPanel;
