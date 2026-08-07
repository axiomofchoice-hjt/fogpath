import { Component, type ReactNode } from "react";
import { useGame } from "../state/useGame";
import { useLang } from "../i18n/useLang";
import { translations, type Language } from "../i18n/translations";

type ErrorBoundaryInnerProps = {
  lang: Language;
  onReset: () => void;
  children: ReactNode;
};

/** 渲染/生命周期错误兜底：展示错误信息，提供刷新与重置恢复 */
class ErrorBoundaryInner extends Component<
  ErrorBoundaryInnerProps,
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary]", error, info.componentStack ?? "");
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = translations[this.props.lang];
    return (
      <div className="h-screen flex items-center justify-center bg-game-bg p-6">
        <div className="bg-game-card border border-game-red/40 rounded p-6 max-w-md w-full">
          <h1 className="text-game-red text-lg font-mono font-bold mb-2">{t["error.title"]}</h1>
          <div className="text-game-dim text-[10px] font-mono mb-1">{t["error.detail"]}</div>
          <pre className="text-game-dim text-xs font-mono whitespace-pre-wrap break-all mb-5 max-h-48 overflow-auto">
            {String(this.state.error.stack ?? this.state.error)}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded text-xs font-mono border border-game-gold/50 bg-game-gold/20 text-game-gold hover:bg-game-gold/30 transition-colors"
            >
              {t["error.reload"]}
            </button>
            <button
              onClick={this.props.onReset}
              className="px-4 py-2 rounded text-xs font-mono border border-game-border text-game-dim hover:text-game-red hover:border-game-red/40 transition-colors"
            >
              {t["error.reset"]}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/** 包裹在 GameProvider/LanguageProvider 内使用的错误边界（重置按钮需 dispatch） */
export function GameErrorBoundary({ children }: { children: ReactNode }) {
  const { dispatch } = useGame();
  const { lang } = useLang();
  return (
    <ErrorBoundaryInner lang={lang} onReset={() => dispatch({ type: "RESET_GAME" })}>
      {children}
    </ErrorBoundaryInner>
  );
}
