import { useEffect, useState, useRef } from "react";

/**
 * Timer – Displays countdown timer in JetBrains Mono.
 * Color turns warn (#FBBF24) in the last 20% and danger (#F87171) in the last 30 s.
 */
export default function Timer({ durationSec, onTick, onEnd, phase }) {
  const [timeLeft, setTimeLeft] = useState(durationSec);

  const onTickRef = useRef(onTick);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    setTimeLeft(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onEndRef.current) onEndRef.current();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        setTimeout(() => {
          if (onTickRef.current) onTickRef.current(durationSec - next, next);
          if (next <= 0 && onEndRef.current) onEndRef.current();
        }, 0);
        if (next <= 0) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [durationSec]);

  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;

  const isLast30s = timeLeft <= 30;
  const isLast20Pct = timeLeft <= durationSec * 0.2;

  const timerColorClass = isLast30s
    ? "text-danger animate-pulse"
    : isLast20Pct
    ? "text-warn"
    : "text-ink";

  const phaseLabels = {
    opening: "Opening",
    middle: "Discussion",
    closing: "Closing",
    ended: "Ended",
  };

  return (
    <div className="flex items-center gap-3">
      {/* Phase badge */}
      <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-surface border border-border text-muted">
        {phaseLabels[phase] || phase}
      </span>

      {/* Timer display */}
      <div
        className={`font-mono text-xl sm:text-2xl font-bold tabular-nums tracking-tight ${timerColorClass}`}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
    </div>
  );
}
