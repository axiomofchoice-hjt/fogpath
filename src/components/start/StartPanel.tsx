import { useGame } from "../../state/gameContext";
import { useLang } from "../../i18n/LanguageContext";
import { loc } from "../../i18n/translations";
import { testScenarioGroups } from "../../data/testScenarios";

function StartPanel() {
  const { dispatch } = useGame();
  const { t, lang, toggleLang } = useLang();

  return (
    <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="text-center mb-8 mt-4">
          <div className="text-[40px] font-bold font-mono tracking-widest text-game-gold">
            雾之径
          </div>
          <div className="text-game-dim text-xs font-mono tracking-[0.4em] mt-2">
            FOG PATH
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <button
            onClick={() => dispatch({ type: "START_GAME" })}
            className="w-full px-6 py-3 text-sm font-mono rounded border border-game-green/50 bg-game-green/15 text-game-green hover:bg-game-green/25 transition-colors"
          >
            {t("start.enterVillage")}
          </button>
          <button
            onClick={toggleLang}
            className="w-full px-6 py-2 text-xs font-mono rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
          >
            {lang === "zh" ? "EN / English" : "中 / 中文"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-game-border" />
            <span className="text-game-dim text-[10px] font-mono tracking-wider">
              {t("start.testBattles")}
            </span>
            <div className="h-px flex-1 bg-game-border" />
          </div>

          {testScenarioGroups.map((group) => (
            <div key={group.id}>
              <div className="text-game-dim text-[10px] font-mono mb-2 tracking-wider">
                {loc(group.name, lang)}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {group.scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="flex items-center gap-2 px-3 py-2 bg-game-card border border-game-border rounded opacity-60 cursor-not-allowed"
                    title={loc(scenario.description, lang)}
                  >
                    <span className="text-game-text text-xs font-mono flex-1">
                      {loc(scenario.name, lang)}
                    </span>
                    <span className="text-game-dim text-[9px] font-mono border border-game-border rounded px-1.5 py-0.5">
                      {t("start.placeholder")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default StartPanel;
