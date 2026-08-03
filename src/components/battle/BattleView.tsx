import { useEffect, useRef, useState } from "react";
import { useGame } from "../../state/gameContext";
import { useLang } from "../../i18n/LanguageContext";
import { loc } from "../../i18n/translations";
import { skills as skillDefs } from "../../data/skills";
import { enemyDefs } from "../../data/enemies";

type Mode = "idle" | "skills" | "target";

function BattleView() {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const battle = state.battle;
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battle?.log.length]);

  useEffect(() => {
    if (battle?.result !== "ongoing") {
      setMode("idle");
      setSelectedSkill(null);
    }
  }, [battle?.result]);

  if (!battle) return null;

  const aliveEnemies = battle.enemies
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.hp > 0);
  const activeSkills = Object.values(skillDefs);

  const doAttack = (skillId: string) => {
    if (aliveEnemies.length === 1) {
      dispatch({
        type: "BATTLE_ACT",
        action: { kind: "attack", skillId, targetIndex: aliveEnemies[0].i },
      });
      setMode("idle");
    } else {
      setSelectedSkill(skillId);
      setMode("target");
    }
  };

  const doGuard = () => {
    dispatch({ type: "BATTLE_ACT", action: { kind: "guard" } });
    setMode("idle");
  };

  const doRegen = () => {
    dispatch({ type: "BATTLE_ACT", action: { kind: "regen" } });
    setMode("idle");
  };

  const hpPct = (hp: number, max: number) => Math.max(0, (hp / max) * 100);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-game-gold text-lg font-bold font-mono">
          {t("battle.title")}
        </h2>
        <span className="text-game-dim text-xs font-mono">
          {t("battle.turn", { n: battle.turn })}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {battle.enemies.map((enemy) => {
          const def = enemyDefs[enemy.defId];
          return (
            <div
              key={enemy.defId}
              className={`bg-game-card border rounded p-3 ${
                enemy.hp > 0 ? "border-game-red/40" : "border-game-border opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{def.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-game-text text-sm font-mono">
                      {loc(def.name, lang)}
                    </span>
                    {enemy.isBoss && (
                      <span className="text-game-red text-[9px] font-mono border border-game-red/40 rounded px-1">
                        BOSS
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-game-red">{t("stat.hp")}</span>
                    <span className="text-game-text">
                      {enemy.hp}/{enemy.maxHp}
                    </span>
                  </div>
                  <div className="h-3 bg-game-bg rounded-full overflow-hidden border border-game-border">
                    <div
                      className="h-full bg-game-red rounded-full transition-all duration-300"
                      style={{ width: `${hpPct(enemy.hp, enemy.maxHp)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono mt-2">
                    <span className="text-game-blue">{t("stat.mp")}</span>
                    <span className="text-game-text">
                      {enemy.mp}/{enemy.maxMp}
                    </span>
                  </div>
                  <div className="h-3 bg-game-bg rounded-full overflow-hidden border border-game-border">
                    <div
                      className="h-full bg-game-blue rounded-full transition-all duration-300"
                      style={{ width: `${hpPct(enemy.mp, enemy.maxMp)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {battle.result === "ongoing" && (
        <div className="mb-4">
          {mode === "idle" && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode("skills")}
                className="px-4 py-2 rounded text-xs font-mono border border-game-red/50 bg-game-red/15 text-game-red hover:bg-game-red/25 transition-colors"
              >
                {t("battle.attack")}
              </button>
              <button
                onClick={doGuard}
                className="px-4 py-2 rounded text-xs font-mono border border-game-blue/50 bg-game-blue/15 text-game-blue hover:bg-game-blue/25 transition-colors"
              >
                {t("battle.guard")}
              </button>
              <button
                onClick={doRegen}
                className="px-4 py-2 rounded text-xs font-mono border border-game-green/50 bg-game-green/15 text-game-green hover:bg-game-green/25 transition-colors"
              >
                {t("battle.regen")}
              </button>
            </div>
          )}

          {mode === "skills" && (
            <div className="space-y-1.5">
              {activeSkills.map((skill) => {
                const atk = skill.isBasic ? battle.playerAtk : (skill.atk ?? 0);
                const def = skill.isBasic ? battle.playerDef : (skill.def ?? 0);
                const disabled = battle.playerMp < skill.mpCost;
                return (
                  <button
                    key={skill.id}
                    onClick={() => doAttack(skill.id)}
                    disabled={disabled}
                    className={`w-full text-left px-3 py-2 rounded text-xs font-mono border transition-colors ${
                      disabled
                        ? "bg-game-card border-game-border text-game-dim cursor-not-allowed"
                        : "border-game-red/40 bg-game-red/10 text-game-text hover:bg-game-red/20"
                    }`}
                  >
                    <span className="mr-2">{skill.icon}</span>
                    <span className="font-bold">{loc(skill.name, lang)}</span>
                    <span className="text-game-dim ml-3">
                      {t("battle.skillStats", { a: atk, d: def })}
                    </span>
                    <span className="text-game-blue ml-3">
                      {t("battle.mpCost", { n: skill.mpCost })}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setMode("idle")}
                className="px-3 py-1.5 rounded text-[10px] font-mono border border-game-border text-game-dim hover:text-game-text transition-colors"
              >
                {t("battle.cancel")}
              </button>
            </div>
          )}

          {mode === "target" && (
            <div className="space-y-1.5">
              <div className="text-game-dim text-[10px] font-mono mb-1">
                {t("battle.selectTarget")}
              </div>
              {aliveEnemies.map(({ e, i }) => {
                const def = enemyDefs[e.defId];
                return (
                  <button
                    key={`${e.defId}-${i}`}
                    onClick={() => {
                      if (selectedSkill) {
                        dispatch({
                          type: "BATTLE_ACT",
                          action: { kind: "attack", skillId: selectedSkill, targetIndex: i },
                        });
                      }
                      setMode("idle");
                      setSelectedSkill(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded text-xs font-mono border border-game-red/40 bg-game-red/10 text-game-text hover:bg-game-red/20 transition-colors"
                  >
                    {def.icon} {loc(def.name, lang)}
                    <span className="text-game-dim ml-2">
                      {e.hp}/{e.maxHp}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setMode("skills");
                  setSelectedSkill(null);
                }}
                className="px-3 py-1.5 rounded text-[10px] font-mono border border-game-border text-game-dim hover:text-game-text transition-colors"
              >
                {t("battle.cancel")}
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={logRef}
        className="bg-game-panel/60 border border-game-border rounded p-3 h-48 overflow-y-auto"
      >
        {battle.log.map((entry, i) => (
          <div
            key={i}
            className={`text-[11px] font-mono leading-relaxed ${
              entry.zh.startsWith("—")
                ? "text-game-dim my-1"
                : entry.zh.includes("胜利") || entry.zh.includes("击败")
                  ? "text-game-red"
                  : "text-game-text"
            }`}
          >
            {loc(entry, lang)}
          </div>
        ))}
      </div>

      {battle.result !== "ongoing" && (
        <div className="mt-4 text-center animate-fade-in">
          <div
            className={`text-2xl font-bold font-mono mb-3 ${
              battle.result === "victory" ? "text-game-green" : "text-game-red"
            }`}
          >
            {battle.result === "victory" ? t("battle.victory") : t("battle.defeat")}
          </div>
          <button
            onClick={() => dispatch({ type: "EXIT_BATTLE" })}
            className="px-4 py-2 rounded text-xs font-mono border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
          >
            {t("battle.exit")}
          </button>
        </div>
      )}
    </main>
  );
}

export default BattleView;
