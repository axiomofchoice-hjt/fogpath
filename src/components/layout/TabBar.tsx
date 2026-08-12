import type { PanelTab } from "../../types";
import { PANEL_TABS } from "../../types";
import { useLang } from "../../i18n/useLang";

type TabBarProps = {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
};

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { t } = useLang();

  return (
    <div className="flex gap-1 mb-3">
      {PANEL_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-3 py-1.5 text-xs font-mono border rounded transition-colors duration-150 outline-none focus-visible:ring-1 focus-visible:ring-game-gold/70 ${
            activeTab === tab.id
              ? "text-game-gold bg-game-card border-game-gold/40"
              : "text-game-dim border-game-border hover:text-game-text hover:bg-game-card/50"
          }`}
        >
          {t(`tab.${tab.id}`)} ({tab.shortcut.toUpperCase()})
        </button>
      ))}
    </div>
  );
}

export default TabBar;
