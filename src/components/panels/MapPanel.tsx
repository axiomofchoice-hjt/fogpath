import { useGame } from "../../state/useGame";
import { rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import HubMap from "../map/HubMap";
import DungeonGrid from "../dungeon/DungeonGrid";
import { MiniOutlineButton } from "../ui/buttons";
import { controlMoveDir, type IntelState } from "../control/controlActions";

type MapPanelProps = {
  onExpand: () => void;
  intel: IntelState;
};

function MapPanel({ onExpand, intel }: MapPanelProps) {
  const { state, dispatch } = useGame();
  const { t, lang } = useLang();
  const { player } = state;
  const room = roomMap[player.currentRoomId];

  // 小地图点击移动：与 WASD/键盘同一判定（controlMoveDir 共享）；战斗中不响应
  const moveRoom = (roomId: string) => {
    if (state.battle) return;
    dispatch({ type: "MOVE_ROOM", roomId });
  };

  // 地牢点击：与 WASD 同一判定（controlMoveDir），战斗中不响应；移动会关闭撤离确认（互斥）
  const stepDir = (dir: { x: number; y: number }) => {
    controlMoveDir(state, dir, intel, dispatch);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-game-gold text-xs font-mono font-bold">
          {state.dungeon ? t("dungeon.grid") : t("map.minimap")}
        </h3>
        <MiniOutlineButton onClick={onExpand}>
          {t("map.expand")}
        </MiniOutlineButton>
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
