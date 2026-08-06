import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGame } from "../../state/useGame";
import { useLang } from "../../i18n/useLang";
import HubMap from "./HubMap";

/** 展开大地图（纯查看）：标题置顶 + 返回按钮，鼠标拖动平移观察全图，Esc 关闭 */
function WorldMap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useGame();
  const { t } = useLang();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // 打开瞬间重置拖动偏移：useLayoutEffect 在绘制前执行，避免闪现上次拖动结果
  useLayoutEffect(() => {
    if (open) setOffset({ x: 0, y: 0 });
  }, [open]);

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

  return (
    <div className="fixed inset-0 z-50 bg-game-bg/95 flex flex-col">
      <div className="flex items-center justify-center py-4 relative flex-shrink-0">
        <h2 className="text-game-gold text-lg font-mono font-bold">{t("map.worldMap")}</h2>
        <button
          onClick={onClose}
          className="absolute right-4 text-[10px] font-mono px-3 py-1 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors"
        >
          {"\u2190"} {t("map.back")}
        </button>
      </div>
      <div
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
        }}
      >
        <div
          className="flex items-center justify-center min-h-full"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        >
          <HubMap currentRoomId={state.player.currentRoomId} large />
        </div>
      </div>
    </div>
  );
}

export default WorldMap;
