import { createContext } from "react";
import type { Language, TKey, Params } from "./translations";

export type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TKey, params?: Params) => string;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
