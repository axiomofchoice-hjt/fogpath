import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Language, TKey, Params } from "./translations";
import { translations } from "./translations";
import { LanguageContext } from "./LanguageContextValue";
import type { L } from "../types";

const STORAGE_KEY = "game-lang";

function stringify(value: string | number | L, lang: Language): string {
  if (typeof value === "object" && value !== null) {
    return value[lang] ?? value.en ?? value.zh;
  }
  return String(value);
}

function interpolate(template: string, params: Params | undefined, lang: Language): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? stringify(params[name], lang) : match
  );
}

function loadLang(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "zh" || saved === "en" ? saved : "zh";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(loadLang);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }, []);

  const toggleLang = useCallback(
    () => setLang(lang === "zh" ? "en" : "zh"),
    [lang, setLang]
  );

  const t = useCallback(
    (key: TKey, params?: Params) =>
      interpolate(translations[lang][key], params, lang),
    [lang]
  );

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
