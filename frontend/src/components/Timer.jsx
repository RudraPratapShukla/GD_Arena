import { useEffect, useState } from "react";

/**
 * Timer – Displays countdown timer with phase label.
 */
export default function Timer({ durationSec, onTick, onEnd, phase }) {
  const [timeLeft, setTimeLeft] = useState(durationSec);

  useEffect(() => {
    setTimeLeft(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onEnd) onEnd();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (onTick) onTick(durationSec - next, next);
        if (next <= 0) {
          clearInterval(interval);
          if (onEnd) onEnd();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [durationSec]);

  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;

  const phaseLabels = {
    opening: "Opening",
    middle: "Discussion",
    closing: "Closing",
    ended: "Ended",
  };

  const phaseColors = {
    opening: "text-arena-info",
    middle: "text-arena-success",
    closing: "text-arena-warning",
    ended: "text-arena-danger",
  };

  return (
    <div className="flex items-center gap-3">
      {/* Phase badge */}
      <span
        className={`text-xs px-3 py-1 rounded-full bg-arena-surface-2 border border-arena-border font-medium ${phaseColors[phase] || "text-arena-text-muted"}`}
      >
        {phaseLabels[phase] || phase}
      </span>

      {/* Timer display */}
      <div
        className={`font-mono text-lg font-semibold tabular-nums ${
          timeLeft <= 30 ? "text-arena-danger animate-pulse" : "text-arena-text"
        }`}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
    </div>
  );
}
