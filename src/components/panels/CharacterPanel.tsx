import { useGame } from "../../state/useGame";
import { useLang } from "../../i18n/useLang";
import { StatBar } from "../ui/StatBar";

function CharacterPanel() {
  const { state } = useGame();
  const { t } = useLang();
  const { player } = state;
  const battle = state.battle;

  const hp = battle ? battle.playerStats.hp : player.hp;
  const maxHp = battle ? battle.playerStats.maxHp : player.maxHp;
  const mp = battle ? battle.playerStats.mp : player.mp;
  const maxMp = battle ? battle.playerStats.maxMp : player.maxMp;

  return (
    <div className="space-y-2">
      <div className="text-game-text text-sm font-mono mb-3 text-center">
        {t("stat.adventurer")}
      </div>

      <div className="space-y-1.5">
        <StatBar
          label={t("stat.hp")}
          value={hp}
          max={maxHp}
          fillClass="bg-game-red"
          labelClass="text-game-red"
        />
        <StatBar
          label={t("stat.mp")}
          value={mp}
          max={maxMp}
          fillClass="bg-game-blue"
          labelClass="text-game-blue"
        />
      </div>
    </div>
  );
}

export default CharacterPanel;
