import { useState, useCallback, useEffect } from "react";
import type { PanelTab } from "./types";
import { GameProvider } from "./state/gameContext";
import { useGame } from "./state/useGame";
import { LanguageProvider } from "./i18n/LanguageContext";
import { useLang } from "./i18n/useLang";
import SidePanel from "./components/layout/SidePanel";
import RoomView from "./components/room/RoomView";
import DungeonView from "./components/dungeon/DungeonView";
import BattleView from "./components/battle/BattleView";
import StartPanel from "./components/start/StartPanel";
import CharacterPanel from "./components/panels/CharacterPanel";
import EquipmentPanel from "./components/panels/EquipmentPanel";
import WorldMap from "./components/map/WorldMap";

function Header() {
  const { lang, toggleLang } = useLang();
  const { state, dispatch } = useGame();
  return (
    <header className="h-10 bg-game-panel border-b border-game-border flex items-center px-4 flex-shrink-0 select-none">
      <span className="text-game-gold font-bold tracking-wider">雾之径</span>
      {state.screen === "game" && !state.battle && (
        <button
          onClick={() => dispatch({ type: "BACK_TO_START" })}
          className="ml-4 text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        >
          {lang === "zh" ? "← 开始面板" : "← Start"}
        </button>
      )}
      <button
        onClick={toggleLang}
        className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        title={lang === "zh" ? "Switch to English" : "切换到中文"}
      >
        {lang === "zh" ? "中" : "EN"}
      </button>
    </header>
  );
}

function AppInner() {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<PanelTab>("map");
  const [worldMapOpen, setWorldMapOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case "m":
        setActiveTab("map");
        break;
      case "e":
        setActiveTab("inventory");
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (state.screen !== "game" || state.battle) setWorldMapOpen(false);
  }, [state.screen, state.battle]);

  const center = state.battle ? (
    <BattleView />
  ) : state.dungeon ? (
    <DungeonView />
  ) : (
    <RoomView mapOpen={worldMapOpen} />
  );
  if (state.screen === "start" && !state.battle) return <StartPanel />;

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-game-panel/50 border-r border-game-border flex-shrink-0 overflow-y-auto p-3">
          <CharacterPanel />
          <div className="mt-4">
            <EquipmentPanel />
          </div>
        </aside>
        {center}
        <SidePanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onExpandMap={() => setWorldMapOpen(true)}
        />
      </div>
      <WorldMap open={worldMapOpen} onClose={() => setWorldMapOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <GameProvider>
        <AppInner />
      </GameProvider>
    </LanguageProvider>
  );
}

export default App;
