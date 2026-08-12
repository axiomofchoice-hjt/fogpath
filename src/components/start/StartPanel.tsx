import { useEffect, useRef, useState } from "react";
import { useGame } from "../../state/useGame";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import { testScenarioGroups } from "../../data/testScenarios";
import { testBattleConfigs } from "../../data/battleTestConfigs";
import { rooms as roomMap } from "../../data/config";
import {
  clearSave,
  deserializeSave,
  loadSaveInfo,
  serializeSave,
} from "../../state/save";

function formatTime(savedAt: number, lang: "zh" | "en"): string {
  return new Date(savedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    hour12: false,
  });
}

function StartPanel() {
  const { state, dispatch } = useGame();
  const { t, lang, toggleLang } = useLang();
  const [saveInfo, setSaveInfo] = useState(loadSaveInfo);
  const [importError, setImportError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 状态变化时刷新存档信息：重新开始会清档，残留的“继续冒险”按钮必须同步消失
  useEffect(() => {
    setSaveInfo(loadSaveInfo());
  }, [state]);

  const continueGame = () => {
    if (!saveInfo) return;
    dispatch({ type: "LOAD_SAVE", save: saveInfo.state });
  };
  const exportSave = () => {
    const saved = loadSaveInfo();
    if (!saved) return;
    const blob = new Blob([serializeSave(saved.state)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fogpath-save.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const saved = deserializeSave(text);
      if (!saved) {
        setImportError(true);
        return;
      }
      setImportError(false);
      dispatch({ type: "LOAD_SAVE", save: saved });
    };
    reader.onerror = () => setImportError(true);
    reader.readAsText(file);
  };

  const saveRoom = saveInfo ? roomMap[saveInfo.state.player.currentRoomId] : undefined;
  const saveLocation = saveRoom ? loc(saveRoom.name, lang) : saveInfo?.state.player.currentRoomId;

  return (
    <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="text-center mb-8 mt-4">
          <div className="text-[40px] font-bold font-mono tracking-widest text-game-gold">
            {t("header.title")}
          </div>
          <div className="text-game-dim text-xs font-mono tracking-[0.4em] mt-2">
            FOG PATH
          </div>
        </div>

        {saveInfo && (
          <div className="bg-game-card border border-game-gold/30 rounded p-4 mb-4">
            <div className="text-game-dim text-[10px] font-mono tracking-wider mb-1">
              {t("start.savedTitle")}
            </div>
            <div className="text-game-text text-xs font-mono">
              {saveLocation} · {formatTime(saveInfo.savedAt, lang)}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <button
            onClick={saveInfo ? continueGame : () => dispatch({ type: "START_GAME" })}
            className="w-full px-6 py-3 text-sm font-mono rounded border border-game-green/50 bg-game-green/15 text-game-green hover:bg-game-green/25 transition-colors"
          >
            {saveInfo ? t("start.continue") : t("start.enterVillage")}
          </button>
          <button
            onClick={() => {
              if (window.confirm(t("start.restartConfirm"))) {
                // 清档副作用在 dispatch 前执行（reducer 保持纯函数）
                clearSave();
                dispatch({ type: "RESET_GAME" });
              }
            }}
            className="w-full px-6 py-2 text-xs font-mono rounded border border-game-border text-game-dim hover:text-game-red hover:border-game-red/40 transition-colors"
          >
            {t("start.restart")}
          </button>
          <div className="flex gap-3">
            <button
              onClick={exportSave}
              disabled={!saveInfo}
              className="flex-1 px-6 py-2 text-xs font-mono rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("save.export")}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 px-6 py-2 text-xs font-mono rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
            >
              {t("save.import")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importSave(file);
                e.target.value = "";
              }}
            />
          </div>
          {importError && (
            <div className="text-game-red text-[10px] font-mono">
              {t("save.importError")}
            </div>
          )}
          <button
            onClick={toggleLang}
            className="w-full px-6 py-2 text-xs font-mono rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
          >
            {lang === "zh" ? "EN / English" : "中 / 中文"}
          </button>
          <a
            href="https://github.com/axiomofchoice-hjt/fogpath"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-1.5 px-6 py-2 text-xs font-mono rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
            title={lang === "zh" ? "GitHub 仓库" : "GitHub Repository"}
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {t("header.repo")}
          </a>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-game-border" />
            <span className="text-game-dim text-[10px] font-mono tracking-wider">
              {t("start.testBattles")}
            </span>
            <div className="h-px flex-1 bg-game-border" />
          </div>

          {testScenarioGroups.map((group) => (
            <div key={group.id}>
              <div className="text-game-dim text-[10px] font-mono mb-2 tracking-wider">
                {loc(group.name, lang)}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {group.scenarios.map((scenario) => {
                  const enabled = !!testBattleConfigs[scenario.id];
                  return (
                    <button
                      key={scenario.id}
                      onClick={() =>
                        dispatch({ type: "START_TEST_BATTLE", scenarioId: scenario.id })
                      }
                      disabled={!enabled}
                      className={`flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
                        enabled
                          ? "bg-game-card border border-game-red/40 text-game-text hover:bg-game-red/15 cursor-pointer"
                          : "bg-game-card border border-game-border opacity-60 cursor-not-allowed"
                      }`}
                      title={loc(scenario.description, lang)}
                    >
                      <span className="text-xs font-mono flex-1">
                        {loc(scenario.name, lang)}
                      </span>
                      {!enabled && (
                        <span className="text-game-dim text-[9px] font-mono border border-game-border rounded px-1.5 py-0.5">
                          {t("start.placeholder")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default StartPanel;
