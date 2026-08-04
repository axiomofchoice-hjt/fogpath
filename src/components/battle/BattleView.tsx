import { useEffect, useRef, useState } from "react";
import { useGame } from "../../state/gameContext";
import { useLang } from "../../i18n/LanguageContext";
import { loc } from "../../i18n/translations";
import { skills as skillDefs } from "../../data/skills";
import { enemyDefs } from "../../data/enemies";
import { items as itemDefs } from "../../data/items";

type Mode = "idle" | "target";

type StatRowProps = {
  label: string;
  value: number;
  max: number;
  fillClass: string;
  labelClass: string;
  trackClass?: string;
  gray?: boolean;
};

function StatRow({
  label,
  value,
  max,
  fillClass,
  labelClass,
  trackClass = "bg-game-bg",
  gray = false,
}: StatRowProps) {
  const pct = Math.max(0, (value / Math.max(1, max)) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[11px] font-mono ${gray ? "text-game-dim" : labelClass}`}>
        {label}
      </span>
      <div className={`h-1.5 flex-1 ${trackClass} rounded-full overflow-hidden border border-game-border`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            gray ? "bg-game-dim" : fillClass
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono ${gray ? "text-game-dim" : "text-game-text"}`}>
        {value}/{max}
      </span>
    </div>
  );
}

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

  const doRest = () => {
    dispatch({ type: "BATTLE_ACT", action: { kind: "rest" } });
    setMode("idle");
  };

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
        <div className="bg-game-card border border-game-green/40 rounded p-3">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
              <span className="text-2xl">{"\uD83E\uDD38"}</span>
              <span className="text-game-text text-xs font-mono text-center leading-tight">
                {t("stat.adventurer")}
              </span>
            </div>
            <div className="w-36 flex-shrink-0 space-y-1.5">
              <StatRow
                label={t("stat.hp")}
                value={battle.playerHp}
                max={battle.playerMaxHp}
                fillClass="bg-game-red"
                labelClass="text-game-red"
              />
              <StatRow
                label={t("stat.mp")}
                value={battle.playerMp}
                max={battle.playerMaxMp}
                fillClass="bg-game-blue"
                labelClass="text-game-blue"
              />
            </div>
            <div className="w-36 flex-shrink-0 space-y-1.5">
              <StatRow
                label={t("stat.damage")}
                value={battle.playerDamage}
                max={battle.playerHasAttack ? battle.playerMaxDamage : 0}
                fillClass="bg-game-orange"
                labelClass="text-game-orange"
                trackClass="bg-black"
                gray={!battle.playerHasAttack || battle.playerMomentum <= 0}
              />
              <StatRow
                label={t("stat.momentum")}
                value={battle.playerMomentum}
                max={battle.playerHasAttack ? battle.playerMaxMomentum : 0}
                fillClass="bg-game-deepgreen"
                labelClass="text-game-deepgreen"
                trackClass="bg-black"
                gray={!battle.playerHasAttack || battle.playerMomentum <= 0}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-game-dim text-[9px] font-mono mb-1">
                {t("battle.action")}
              </div>
              <div className="text-game-text text-[11px] font-mono leading-relaxed">
                {loc(battle.playerSummary, lang)}
              </div>
            </div>
          </div>
        </div>

        {battle.enemies.map((enemy) => {
          const def = enemyDefs[enemy.defId];
          return (
            <div
              key={enemy.defId}
              className={`bg-game-card border rounded p-3 ${
                enemy.hp > 0 ? "border-game-red/40" : "border-game-border opacity-50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
                  <span className="text-2xl">{def.icon}</span>
                  <span className="text-game-text text-xs font-mono text-center leading-tight">
                    {loc(def.name, lang)}
                  </span>
                  {enemy.isBoss && (
                    <span className="text-game-red text-[9px] font-mono border border-game-red/40 rounded px-1">
                      BOSS
                    </span>
                  )}
                </div>
                <div className="w-36 flex-shrink-0 space-y-1.5">
                  <StatRow
                    label={t("stat.hp")}
                    value={enemy.hp}
                    max={enemy.maxHp}
                    fillClass="bg-game-red"
                    labelClass="text-game-red"
                  />
                  <StatRow
                    label={t("stat.mp")}
                    value={enemy.mp}
                    max={enemy.maxMp}
                    fillClass="bg-game-blue"
                    labelClass="text-game-blue"
                  />
                </div>
                <div className="w-36 flex-shrink-0 space-y-1.5">
                  <StatRow
                    label={t("stat.damage")}
                    value={enemy.damage}
                    max={enemy.hasAttack ? enemy.maxDamage : 0}
                    fillClass="bg-game-orange"
                    labelClass="text-game-orange"
                    trackClass="bg-black"
                    gray={!enemy.hasAttack || enemy.momentum <= 0}
                  />
                  <StatRow
                    label={t("stat.momentum")}
                    value={enemy.momentum}
                    max={enemy.hasAttack ? enemy.maxMomentum : 0}
                    fillClass="bg-game-deepgreen"
                    labelClass="text-game-deepgreen"
                    trackClass="bg-black"
                    gray={!enemy.hasAttack || enemy.momentum <= 0}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-game-dim text-[9px] font-mono mb-1">
                    {t("battle.action")}
                  </div>
                  <div className="text-game-text text-[11px] font-mono leading-relaxed">
                    {loc(enemy.summary, lang)}
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
            <div className="space-y-1.5">
              {activeSkills.map((skill) => {
                const damage = skill.isBasic ? battle.playerMaxDamage : (skill.damage ?? 0);
                const momentum = skill.isBasic ? battle.playerMaxMomentum : (skill.momentum ?? 0);
                const disabled = battle.playerMp < skill.mpCost;
                const weaponId = state.player.equipment.find(
                  (id) => id && (itemDefs[id]?.atk ?? 0) > 0
                );
                const weapon = weaponId ? itemDefs[weaponId] : null;
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
                    {skill.isBasic && weapon && (
                      <span className="text-game-dim ml-2">
                        【{loc(weapon.name, lang)}】
                      </span>
                    )}
                    <span className="text-game-blue ml-3">
                      {t("battle.mpCost", { n: skill.mpCost })}
                    </span>
                    <span className="text-game-orange ml-3">
                      {t("battle.damage", { n: damage })}
                    </span>
                    <span className="text-game-deepgreen ml-3">
                      {t("battle.momentum", { n: momentum })}
                    </span>
                  </button>
                );
              })}
              {(() => {
                const shieldId = state.player.equipment.find(
                  (id) => id && (itemDefs[id]?.def ?? 0) > 0
                );
                const shield = shieldId ? itemDefs[shieldId] : null;
                return (
                  <button
                    onClick={doGuard}
                    className="w-full text-left px-3 py-2 rounded text-xs font-mono border border-game-blue/40 bg-game-blue/10 text-game-text hover:bg-game-blue/20 transition-colors"
                  >
                    <span className="mr-2">{"\uD83D\uDEE1\uFE0F"}</span>
                    <span className="font-bold">{t("battle.guard")}</span>
                    {shield && (
                      <span className="text-game-dim ml-2">
                        【{loc(shield.name, lang)}】
                      </span>
                    )}
                    <span className="text-game-blue ml-3">
                      {t("battle.mpCost", { n: 0 })}
                    </span>
                    <span className="text-game-gold ml-3">
                      {t("battle.effect")}：{t("battle.guardEffect")}
                    </span>
                  </button>
                );
              })()}
              <button
                onClick={doRest}
                className="w-full text-left px-3 py-2 rounded text-xs font-mono border border-game-green/40 bg-game-green/10 text-game-text hover:bg-game-green/20 transition-colors"
              >
                <span className="mr-2">{"\uD83D\uDECC"}</span>
                <span className="font-bold">{t("battle.rest")}</span>
                <span className="text-game-gold ml-3">
                  {t("battle.effect")}：{t("battle.restEffect", { n: 50 })}
                </span>
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
                  setMode("idle");
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
