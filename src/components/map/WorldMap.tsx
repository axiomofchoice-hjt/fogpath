import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGame } from "../../state/useGame";
import { dungeons as dungeonDefs, rooms as roomMap } from "../../data/config";
import { useLang } from "../../i18n/useLang";
import { loc } from "../../i18n/translations";
import HubMap from "./HubMap";
import DungeonGrid from "../dungeon/DungeonGrid";
import { MiniOutlineButton } from "../ui/buttons";
import { GAP, TILE } from "./layoutConstants";

/** 夹紧：仅当地图大于视口时贴边（不留空白）；地图小于视口时直接取目标值（整图可见、当前房间居中） */
function clampOffset(target: number, viewport: number, map: number): number {
  if (map <= viewport) return target;
  return Math.min(Math.max(target, viewport - map), 0);
}

/** 展开大地图（纯查看）：标题置顶 + 返回按钮，鼠标拖动平移观察全图，Esc 关闭。
 *  打开时以当前房间为中心定位（地图大于视口时贴边），村庄显示村庄枢纽图，
 *  地牢中显示地牢全图。 */
function WorldMap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useGame();
  const { t, lang } = useLang();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 打开时焦点移入返回按钮，关闭/卸载时还原到打开前的焦点元素（键盘玩家可立即 Tab 到弹层）
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prev?.focus?.();
  }, [open]);

  // 打开瞬间定位：当前房间居中（绘制前计算，避免闪现上次拖动结果）
  useLayoutEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    // 目标 = 视口中心（减去容器在视口中的偏移，头部等固定 UI 不影响居中）
    const rect = el.getBoundingClientRect();
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const targetX = window.innerWidth / 2 - rect.left;
    const targetY = window.innerHeight / 2 - rect.top;
    if (state.dungeon) {
      const p = state.dungeon.playerPos;
      const { w, h } = state.dungeon.size;
      const mapW = w * TILE + (w - 1) * GAP;
      const mapH = h * TILE + (h - 1) * GAP;
      const cx = p.x * (TILE + GAP) + TILE / 2;
      const cy = p.y * (TILE + GAP) + TILE / 2;
      setOffset({
        x: clampOffset(targetX - cx, vw, mapW),
        y: clampOffset(targetY - cy, vh, mapH),
      });
    } else {
      const rooms = Object.values(roomMap);
      const current = roomMap[state.player.currentRoomId];
      if (!current) return;
      const minX = Math.min(...rooms.map((r) => r.pos.x));
      const minY = Math.min(...rooms.map((r) => r.pos.y));
      const maxX = Math.max(...rooms.map((r) => r.pos.x));
      const maxY = Math.max(...rooms.map((r) => r.pos.y));
      const cols = maxX - minX + 1;
      const rows = maxY - minY + 1;
      const mapW = cols * TILE + (cols - 1) * GAP;
      const mapH = rows * TILE + (rows - 1) * GAP;
      const cx = (current.pos.x - minX) * (TILE + GAP) + TILE / 2;
      const cy = (current.pos.y - minY) * (TILE + GAP) + TILE / 2;
      setOffset({
        x: clampOffset(targetX - cx, vw, mapW),
        y: clampOffset(targetY - cy, vh, mapH),
      });
    }
  }, [open, state.dungeon, state.player.currentRoomId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setOffset({
        x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
        y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [open, onClose]);

  if (!open) return null;

  const dungeon = state.dungeon;
  const dungeonDef = dungeon ? dungeonDefs[dungeon.dungeonId] : undefined;
  const title = dungeonDef ? `${dungeonDef.icon} ${loc(dungeonDef.name, lang)}` : t("map.worldMap");

  return (
    <div data-testid="world-map-overlay" className="fixed inset-0 z-50 bg-game-bg/95 flex flex-col">
      <div className="flex items-center justify-center py-4 relative flex-shrink-0">
        <h2 className="text-game-gold text-lg font-mono font-bold">{title}</h2>
        <MiniOutlineButton ref={closeRef} className="absolute right-4" onClick={onClose}>
          {"\u2190"} {t("map.back")}
        </MiniOutlineButton>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
        }}
      >
        <div
          data-testid="world-map-canvas"
          className="w-max"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        >
          {dungeon ? (
            <DungeonGrid dungeon={dungeon} large />
          ) : (
            <HubMap currentRoomId={state.player.currentRoomId} large />
          )}
        </div>
      </div>
    </div>
  );
}

export default WorldMap;
