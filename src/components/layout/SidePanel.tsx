import type { PanelTab } from "../../types";
import TabBar from "./TabBar";
import MapPanel from "../panels/MapPanel";
import InventoryPanel from "../panels/InventoryPanel";

type SidePanelProps = {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onExpandMap: () => void;
};

function SidePanel({ activeTab, onTabChange, onExpandMap }: SidePanelProps) {
  return (
    <aside className="w-64 bg-game-panel/50 border-l border-game-border flex-shrink-0 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto p-3">
        <TabBar activeTab={activeTab} onTabChange={onTabChange} />
        {activeTab === "map" && <MapPanel onExpand={onExpandMap} />}
        {activeTab === "inventory" && <InventoryPanel />}
      </div>
    </aside>
  );
}

export default SidePanel;
