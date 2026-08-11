import { useGame } from "../../state/useGame";
import { rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import HubMap from "../map/HubMap";
import DungeonGrid from "../dungeon/DungeonGrid";
import { dungeonStep } from "../map/nav";

type MapPanelProps = {
  onExpand: () => void;
  pending: { x: number; y: number } | null;
  onPendingChange: (p: { x: number; y: number } | null) => void;
  retreatOpen: boolean;
  onRetreatOpenChange: (open: boolean) => void;
};

function MapPanel({ onExpand, pending, onPendingChange, retreatOpen, onRetreatOpenChange }: MapPanelProps) {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

  // 战斗中不响应点击（合法拒绝：战斗时侧栏仍渲染但不可移动）
  const moveRoom = (roomId: string) => {
    if (state.battle) return;
    dispatch({ type: "MOVE_ROOM", roomId });
  };

  // 地牢点击：与 WASD 同一判定（dungeonStep），战斗中不响应；移动会关闭撤离确认（互斥）
  const stepDir = (dir: { x: number; y: number }) => {
    if (state.battle || !state.dungeon) return;
    const step = dungeonStep(state.dungeon, dir, pending);
    if (step.kind === "intel") {
      onPendingChange({ x: step.x, y: step.y });
      if (retreatOpen) onRetreatOpenChange(false);
    } else if (step.kind === "move") {
      dispatch({ type: "DUNGEON_MOVE", dx: step.dx, dy: step.dy });
      if (retreatOpen) onRetreatOpenChange(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-game-gold text-xs font-mono font-bold">
          {state.dungeon ? t("dungeon.grid") : t("map.minimap")}
        </h3>
        <button
          onClick={onExpand}
          className="text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        >
          {t("map.expand")}
        </button>
      </div>
      <div className="bg-game-card border border-game-border rounded p-3">
        {state.dungeon ? (
          <>
            <div className="text-game-dim text-[9px] font-mono mb-1">
              {t("map.current")}
              <span className="text-game-text">
                {t("dungeon.room")} ({state.dungeon.playerPos.x + 1},{state.dungeon.playerPos.y + 1})
              </span>
            </div>
            <DungeonGrid dungeon={state.dungeon} onStep={stepDir} />
          </>
        ) : (
          <>
            <div className="text-game-dim text-[9px] font-mono mb-1">
              {t("map.current")}
              <span className="text-game-text">{room ? loc(room.name, lang) : "?"}</span>
            </div>
            <HubMap currentRoomId={player.currentRoomId} onMoveRoom={moveRoom} />
            {room && (
              <div className="text-game-dim text-[10px] font-mono mt-1">
                {t("map.area")}
                {loc(room.area, lang)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MapPanel;
