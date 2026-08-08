import { useEffect, useRef, useState } from "react";
import { useGame } from "../../state/useGame";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import { testScenarioGroups } from "../../data/testScenarios";
import { testBattleConfigs } from "../../data/battleTestConfigs";
import { rooms as roomMap } from "../../data/config";
import {
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
            雾之径
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
