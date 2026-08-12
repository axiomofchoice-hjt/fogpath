import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from "react";

/** 小号描边按钮（顶栏/侧栏/弹层共用样式，勿在各组件内重写类串） */
export function MiniOutlineButton({
  className = "",
  children,
  ref,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      className={`text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** 小号描边链接（同 MiniOutlineButton 样式的 <a>） */
export function MiniOutlineLink({
  className = "",
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={`text-[9px] font-mono px-2 py-0.5 rounded border border-game-border text-game-dim hover:text-game-gold hover:border-game-gold/40 transition-colors ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}

/** 金色通栏大按钮（进入地牢/撤离，主界面动作） */
export function GoldWideButton({
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full px-4 py-3 rounded text-sm font-mono border border-game-gold/40 bg-game-gold/10 text-game-gold hover:bg-game-gold/20 transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
