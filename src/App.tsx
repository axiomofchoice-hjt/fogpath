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
import { ControlBar } from "./components/layout/ControlBar";
import { GameErrorBoundary } from "./components/ErrorBoundary";

function Header() {
  const { lang, toggleLang } = useLang();
  const { state, dispatch } = useGame();
  return (
    <header className="h-10 bg-game-panel border-b border-game-border flex items-center px-4 flex-shrink-0 select-none">
      <span className="text-game-gold font-bold tracking-wider">雾之径</span>
      {state.screen === "game" && !state.battle && !state.dungeon && (
        <button
          onClick={() => dispatch({ type: "BACK_TO_START" })}
          className="ml-4 text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        >
          {lang === "zh" ? "← 开始面板" : "← Start"}
        </button>
      )}
      <a
        href="https://github.com/axiomofchoice-hjt/fogpath"
        target="_blank"
        rel="noreferrer"
        className="ml-auto flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        title={lang === "zh" ? "GitHub 仓库" : "GitHub Repository"}
      >
        <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
        {lang === "zh" ? "仓库" : "Repo"}
      </a>
      <button
        onClick={toggleLang}
        className="ml-1 text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        title={lang === "zh" ? "Switch to English" : "切换到中文"}
      >
        {lang === "zh" ? "中" : "EN"}
      </button>
    </header>
  );
}

export function AppInner() {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<PanelTab>("map");
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [intelPending, setIntelPending] = useState<{ x: number; y: number } | null>(null);
  const [retreatOpen, setRetreatOpen] = useState(false);

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

  useEffect(() => {
    setIntelPending(null);
    setRetreatOpen(false);
  }, [state.battle, state.dungeon]);

  const center = state.battle ? (
    <BattleView />
  ) : state.dungeon ? (
    <DungeonView
      mapOpen={worldMapOpen}
      pending={intelPending}
      onPendingChange={setIntelPending}
      retreatOpen={retreatOpen}
      onRetreatOpenChange={setRetreatOpen}
    />
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
          pending={intelPending}
          onPendingChange={setIntelPending}
          retreatOpen={retreatOpen}
          onRetreatOpenChange={setRetreatOpen}
        />
      </div>
      <ControlBar mapOpen={worldMapOpen} pending={intelPending} retreatOpen={retreatOpen} />
      <WorldMap open={worldMapOpen} onClose={() => setWorldMapOpen(false)} />    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <GameProvider>
        <GameErrorBoundary>
          <AppInner />
        </GameErrorBoundary>
      </GameProvider>
    </LanguageProvider>
  );
}

export default App;
