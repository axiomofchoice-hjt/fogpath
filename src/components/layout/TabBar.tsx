import type { PanelTab } from "../../types";
import { useLang } from "../../i18n/useLang";

type TabBarProps = {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
};

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { t } = useLang();

  const tabs: { id: PanelTab; label: string; shortcut: string }[] = [
    { id: "map", label: t("tab.map"), shortcut: "M" },
    { id: "inventory", label: t("tab.inventory"), shortcut: "T" },
  ];

  return (
    <div className="flex gap-1 mb-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-3 py-1.5 text-xs font-mono border rounded transition-colors duration-150 ${
            activeTab === tab.id
              ? "text-game-gold bg-game-card border-game-gold/40"
              : "text-game-dim border-game-border hover:text-game-text hover:bg-game-card/50"
          }`}
        >
          {tab.label} ({tab.shortcut})
        </button>
      ))}
    </div>
  );
}

export default TabBar;
