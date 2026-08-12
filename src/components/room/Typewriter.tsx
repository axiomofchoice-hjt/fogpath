import { useState, useEffect, useRef } from "react";

type TypewriterProps = {
  text: string;
  speed?: number;
  onComplete?: () => void;
};

function Typewriter({ text, speed = 30, onComplete }: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idx.current = 0;

    intervalRef.current = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, onComplete]);

  /** 点击跳过：清掉残留 interval（否则后续 tick 会把全文截断回当前位置再重播），直接显示全文 */
  const skip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    idx.current = text.length;
    setDisplayed(text);
    if (!done) {
      setDone(true);
      onComplete?.();
    }
  };

  return (
    <p
      className="text-game-text text-sm leading-relaxed mb-6 cursor-pointer"
      onClick={skip}
    >
      {displayed}
      {!done && (
        <span className="inline-block w-1.5 h-3.5 bg-game-gold ml-0.5 animate-pulse align-middle" />
      )}
    </p>
  );
}

export default Typewriter;
