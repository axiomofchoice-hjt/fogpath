type InteractCardProps = {
  icon: string;
  name: string;
  sub: string;
  actionLabel: string;
  accentColor: string;
  onClick?: () => void;
};

function InteractCard({
  icon,
  name,
  sub,
  actionLabel,
  accentColor,
  onClick,
}: InteractCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-game-card border border-game-border rounded p-3 flex items-center gap-3
        transition-colors cursor-pointer animate-fade-in
        hover:border-${accentColor}/50 group`}
      style={{ animationFillMode: "backwards" }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-game-text text-sm font-mono truncate">{name}</div>
        <div className="text-game-dim text-[10px]">{sub}</div>
      </div>
      <span
        className={`text-${accentColor} text-[10px] font-mono opacity-60 group-hover:opacity-100 transition-opacity`}
      >
        {actionLabel}
      </span>
    </div>
  );
}

export default InteractCard;
