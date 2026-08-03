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

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idx.current = 0;

    const interval = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <p
      className="text-game-text text-sm leading-relaxed mb-6 cursor-pointer"
      onClick={() => {
        setDisplayed(text);
        if (!done) {
          setDone(true);
          onComplete?.();
        }
      }}
    >
      {displayed}
      {!done && (
        <span className="inline-block w-1.5 h-3.5 bg-game-gold ml-0.5 animate-pulse align-middle" />
      )}
    </p>
  );
}

export default Typewriter;
