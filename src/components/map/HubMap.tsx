import { rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";

export type HubMapProps = {
  currentRoomId: string;
  large?: boolean;
};

/** 小地图窗口半径：显示玩家周围 (2r+1)×(2r+1) = 7×7 格，玩家始终居中 */
const MINI_RADIUS = 3;

/** 村庄枢纽方块地图（纯查看，不可交互）：小地图 / 展开大地图共用（pos 为网格坐标）。
 *  小地图 7×7 窗口以玩家为中心；大地图显示全图，方块更大。 */
function HubMap({ currentRoomId, large = false }: HubMapProps) {
  const { lang } = useLang();
  const rooms = Object.values(roomMap);
  const current = roomMap[currentRoomId];
  if (rooms.length === 0 || !current) return null;

  const minX = Math.min(...rooms.map((r) => r.pos.x));
  const minY = Math.min(...rooms.map((r) => r.pos.y));
  const maxX = Math.max(...rooms.map((r) => r.pos.x));
  const maxY = Math.max(...rooms.map((r) => r.pos.y));
  // 小地图：玩家居中 7×7 窗口；大地图：全图
  const vMinX = large ? minX : current.pos.x - MINI_RADIUS;
  const vMinY = large ? minY : current.pos.y - MINI_RADIUS;
  const cols = large ? maxX - minX + 1 : MINI_RADIUS * 2 + 1;
  const rows = large ? maxY - minY + 1 : MINI_RADIUS * 2 + 1;

  const roomAt = new Map(rooms.map((r) => [`${r.pos.x},${r.pos.y}`, r]));
  const cells: { x: number; y: number; room?: (typeof rooms)[number] }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ x, y, room: roomAt.get(`${vMinX + x},${vMinY + y}`) });
    }
  }

  // 大地图：固定 48px 方块（与地牢展开地图一致）；小地图 1fr 自适应 7×7 窗口
  const tilePx = large ? 48 : undefined;

  return (
    <div
      className={`grid select-none ${large ? "gap-1" : "gap-1 w-full"}`}
      style={{
        gridTemplateColumns: tilePx
          ? `repeat(${cols}, ${tilePx}px)`
          : `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {cells.map(({ x, y, room }) => {
        const key = `${x},${y}`;
        if (!room) {
          // 空位：可见的淡色方块铺底，保持棋盘感
          return (
            <div
              key={key}
              className="aspect-square rounded-[3px] border border-game-border/70 bg-game-panel/60"
            />
          );
        }
        const isCurrent = room.id === currentRoomId;
        return (
          <div
            key={key}
            title={loc(room.name, lang)}
            className={`aspect-square flex flex-col items-center justify-center rounded-[3px] font-mono overflow-hidden ${
              isCurrent ? "bg-game-gold/30 border-game-gold" : "bg-game-card border-game-border"
            } border-2`}
          >
            <span className={large ? "text-2xl" : "text-sm"}>
              {room.npc?.icon ?? "\uD83C\uDFD9\uFE0F"}
            </span>
            {large && (
              <span
                className={`text-[9px] leading-tight mt-0.5 px-1 truncate max-w-full ${
                  isCurrent ? "text-game-gold" : "text-game-text"
                }`}
              >
                {loc(room.name, lang)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default HubMap;
