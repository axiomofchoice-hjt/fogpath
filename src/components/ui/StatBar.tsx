type StatBarProps = {
  label: string;
  value: number;
  max: number;
  fillClass: string;
  labelClass: string;
  /** 灰显（被格挡/无攻击属性时伤害条） */
  gray?: boolean;
  /** 轨道底色（CharacterPanel 与 BattleView 各用各的，勿二处重写结构） */
  trackClass?: string;
};

/** 属性条（生命/法力/伤害）：CharacterPanel 与 BattleView 共用，除零防护统一在此 */
export function StatBar({
  label,
  value,
  max,
  fillClass,
  labelClass,
  gray = false,
  trackClass = "bg-game-bg",
}: StatBarProps) {
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
