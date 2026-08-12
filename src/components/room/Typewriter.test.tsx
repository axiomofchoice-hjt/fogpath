import { describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Typewriter from "./Typewriter";

const TEXT = "一间被雾气笼罩的林间空地。";

afterEach(() => {
  vi.useRealTimers();
});

describe("Typewriter", () => {
  it("逐字显示，完成后回调", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<Typewriter text={TEXT} speed={30} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByText(TEXT.slice(0, 2))).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(TEXT.length * 30);
    });
    expect(screen.getByText(TEXT)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("点击跳过：立即显示全文且不因残留定时器回退", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<Typewriter text={TEXT} speed={30} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(90);
    });
    fireEvent.click(screen.getByText(TEXT.slice(0, 3)));
    expect(screen.getByText(TEXT)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    // 若 interval 未清除：后续 tick 会把全文截断回当前位置再重播（bug）。
    // 推进量须小于剩余打字时长（13 字已打 3 字 → 余 10 tick = 300ms），否则自然打完会掩盖回退
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.getByText(TEXT)).toBeInTheDocument();
    // 再推进至完成：全文保持，不重播
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText(TEXT)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
