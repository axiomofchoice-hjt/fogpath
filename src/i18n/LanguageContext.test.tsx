import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "./LanguageContext";
import { useLang } from "./useLang";

function Probe() {
  const { t, lang, toggleLang } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="hp">{t("stat.hp")}</span>
      <span data-testid="interp">{t("shop.price", { n: 5 })}</span>
      <button onClick={toggleLang}>toggle</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("LanguageContext", () => {
  it("默认中文；切换后英文并持久化到 localStorage", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang").textContent).toBe("zh");
    expect(screen.getByTestId("hp").textContent).toBe("生命");
    await user.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("hp").textContent).toBe("HP");
    expect(localStorage.getItem("game-lang")).toBe("en");
  });

  it("重新挂载读取持久化语言", () => {
    localStorage.setItem("game-lang", "en");
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("hp").textContent).toBe("HP");
  });

  it("参数插值：{{n}} 替换为数字", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId("interp").textContent).toBe("5 金币");
  });
});
