import { useContext } from "react";
import { LanguageContext } from "./LanguageContextValue";

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
