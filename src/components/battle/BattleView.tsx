import { useEffect, useRef, useState } from "react";
import type { CombatStats, L, StatusId } from "../../types";
import { useGame } from "../../state/useGame";
import { useLang } from "../../i18n/useLang";
import { loc, type TKey, type Params } from "../../i18n/translations";
import { skills as skillDefs } from "../../data/skills";
import { enemyDefs } from "../../data/enemies";
import { items as itemDefs } from "../../data/items";
import { GUARD_MP, REST_MP, SHIELD_REDUCTION } from "../../state/battleEngine";

type Mode = "idle" | "target";

const SHIELD_PCT = Math.round(SHIELD_REDUCTION * 100);

/** 状态文字与效果描述（双语键） */
const STATUS_INFO: Record<
  StatusId,
  { nameKey: TKey; descKey: TKey; params?: Params }
> = {
  guard: {
    nameKey: "battle.status.guard.name",
    descKey: "battle.status.guard.desc",
    params: { pct: SHIELD_PCT },
  },
};

type StatRowProps = {
  label: string;
  value: number;
  max: number;
  fillClass: string;
  labelClass: string;
  gray?: boolean;
};

function StatRow({ label, value, max, fillClass, labelClass, gray = false }: StatRowProps) {
  const pct = Math.max(0, (value / Math.max(1, max)) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[11px] font-mono ${gray ? "text-game-dim" : labelClass}`}>
        {label}
      </span>
      <div className="h-1.5 flex-1 bg-black rounded-full overflow-hidden border border-game-border">
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

type CombatantCardProps = {
  icon: string;
  name: string;
  badge?: React.ReactNode;
  borderClass: string;
  dimmed?: boolean;
  stats: CombatStats;
  /** 当前状态（可多个，横排显示在摘要上方） */
  statuses: StatusId[];
  summary: string;
};

function CombatantCard({
  icon,
  name,
  badge,
  borderClass,
  dimmed = false,
  stats: { hp, maxHp, mp, maxMp, damage, maxDamage, momentum, maxMomentum, hasAttack },
  statuses,
  summary,
}: CombatantCardProps) {
  const { t } = useLang();
  const attackGray = !hasAttack || momentum <= 0;
  return (
    <div className={`bg-game-card border ${dimmed ? "opacity-50" : ""} rounded p-3 ${borderClass}`}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
          <span className="text-2xl">{icon}</span>
          <span className="text-game-text text-xs font-mono text-center leading-tight">
            {name}
          </span>
          {badge}
        </div>
        <div className="w-36 flex-shrink-0 space-y-1.5">
          <StatRow
            label={t("stat.hp")}
            value={hp}
            max={maxHp}
            fillClass="bg-game-red"
            labelClass="text-game-red"
          />
          <StatRow
            label={t("stat.mp")}
            value={mp}
            max={maxMp}
            fillClass="bg-game-blue"
            labelClass="text-game-blue"
          />
        </div>
        <div className="w-36 flex-shrink-0 space-y-1.5">
          <StatRow
            label={t("stat.damage")}
            value={damage}
            max={hasAttack ? maxDamage : 0}
            fillClass="bg-game-orange"
            labelClass="text-game-orange"
            gray={attackGray}
          />
          <StatRow
            label={t("stat.momentum")}
            value={momentum}
            max={hasAttack ? maxMomentum : 0}
            fillClass="bg-game-lightgreen"
            labelClass="text-game-lightgreen"
            gray={attackGray}
          />
        </div>
        <div className="flex-1 min-w-0">
          {statuses.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {statuses.map((s) => (
                <span
                  key={s}
                  title={t(STATUS_INFO[s].descKey, STATUS_INFO[s].params)}
                  className="text-[9px] font-mono border border-game-gold/40 text-game-gold rounded px-1.5 py-0.5 bg-game-gold/10"
                >
                  {t(STATUS_INFO[s].nameKey)}
                </span>
              ))}
            </div>
          )}
          <div className="text-game-text text-[11px] font-mono leading-relaxed">{summary}</div>
        </div>
      </div>
    </div>
  );
}

type ActionRowProps = {
  icon: string;
  title: string;
  sub?: string;
  meta: { text: string; className?: string }[];
  className: string;
  disabled?: boolean;
  onClick: () => void;
};

function ActionRow({ icon, title, sub, meta, className, disabled = false, onClick }: ActionRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded text-xs font-mono border transition-colors ${
        disabled
          ? "bg-game-card border-game-border text-game-dim cursor-not-allowed"
          : className
      }`}
    >
      <span className="mr-2">{icon}</span>
      <span className="font-bold">{title}</span>
      {sub && <span className="text-game-dim ml-2">{sub}</span>}
      {meta.map((m, i) => (
        <span key={i} className={`ml-3 ${m.className ?? ""}`}>
          {m.text}
        </span>
      ))}
    </button>
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
  const shieldId = battle.equipment.find((id) => id && itemDefs[id]?.isShield);
  const shield = shieldId ? itemDefs[shieldId] : null;

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

  // 动作按钮：装备提供的技能 + 防御（有盾时）+ 休息，统一渲染
  const actionRows: ActionRowProps[] = [
    ...battle.playerActions.flatMap((act) => {
      const skill = skillDefs[act.skillId];
      if (!skill) return [];
      const sourceId = battle.equipment.find(
        (id) => id && itemDefs[id]?.actions?.some((a) => a.skillId === act.skillId)
      );
      const source = sourceId ? itemDefs[sourceId] : null;
      return [
        {
          icon: skill.icon,
          title: loc(skill.name, lang),
          sub: source ? `【${loc(source.name, lang)}】` : undefined,
          meta: [
            { text: t("battle.mpCost", { n: skill.mpCost }), className: "text-game-blue" },
            { text: t("battle.damage", { n: act.damage }), className: "text-game-orange" },
            { text: t("battle.momentum", { n: act.momentum }), className: "text-game-lightgreen" },
          ],
          className: "border-game-red/40 bg-game-red/10 text-game-text hover:bg-game-red/20",
          disabled: battle.playerStats.mp < skill.mpCost,
          onClick: () => doAttack(act.skillId),
        },
      ];
    }),
    ...(shield
      ? [
          {
            icon: "\uD83D\uDEE1\uFE0F",
            title: t("battle.guard"),
            sub: `【${loc(shield.name, lang)}】`,
            meta: [
              { text: t("battle.mpCost", { n: GUARD_MP }), className: "text-game-blue" },
              { text: `${t("battle.effect")}：${t("battle.guardEffect", { pct: SHIELD_PCT })}`, className: "text-game-gold" },
            ],
            className: "border-game-blue/40 bg-game-blue/10 text-game-text hover:bg-game-blue/20",
            disabled: battle.playerStats.mp < GUARD_MP,
            onClick: doGuard,
          },
        ]
      : []),
    {
      icon: "\uD83D\uDECC",
      title: t("battle.rest"),
      meta: [
        { text: `${t("battle.effect")}：${t("battle.restEffect", { n: REST_MP })}`, className: "text-game-gold" },
      ],
      className: "border-game-green/40 bg-game-green/10 text-game-text hover:bg-game-green/20",
      onClick: doRest,
    },
  ];

  const logClass = (entry: L) =>
    entry.zh.startsWith("—")
      ? "text-game-dim my-1"
      : entry.zh.includes("胜利") || entry.zh.includes("击败")
        ? "text-game-red"
        : "text-game-text";

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-game-gold text-lg font-bold font-mono">{t("battle.title")}</h2>
        <span className="text-game-dim text-xs font-mono">{t("battle.turn", { n: battle.turn })}</span>
      </div>

      <div className="space-y-2 mb-4">
        <CombatantCard
          icon={"\uD83E\uDD38"}
          name={t("stat.adventurer")}
          borderClass="border-game-green/40"
          stats={battle.playerStats}
          statuses={battle.shieldActive ? ["guard"] : []}
          summary={loc(battle.playerSummary, lang)}
        />
        {battle.enemies.map((enemy, i) => {
          const def = enemyDefs[enemy.defId];
          const alive = enemy.hp > 0;
          return (
            <CombatantCard
              key={`${enemy.defId}-${i}`}
              icon={def.icon}
              name={loc(def.name, lang)}
              badge={
                enemy.isBoss && (
                  <span className="text-game-red text-[9px] font-mono border border-game-red/40 rounded px-1">
                    BOSS
                  </span>
                )
              }
              borderClass={alive ? "border-game-red/40" : "border-game-border"}
              dimmed={!alive}
              stats={enemy}
              statuses={[]}
              summary={loc(enemy.summary, lang)}
            />
          );
        })}
      </div>

      {battle.result === "ongoing" && (
        <div className="mb-4">
          {mode === "idle" && (
            <div className="space-y-1.5">
              {actionRows.map((row, i) => (
                <ActionRow key={i} {...row} />
              ))}
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
          <div key={i} className={`text-[11px] font-mono leading-relaxed ${logClass(entry)}`}>
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
