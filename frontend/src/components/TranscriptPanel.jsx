import { useEffect, useRef } from "react";
import { PARTICIPANT_INFO } from "../lib/controller";

/**
 * TranscriptPanel – Scrollable transcript with live captions.
 * - Speaker name in speaker color
 * - Text in ink (#F2EFE8)
 * - Timestamp in muted (#9A9CA5)
 * - Live captions: mono font, bottom, accent-colored caret on interim text
 */
export default function TranscriptPanel({ transcript, interimText, bufferedText, showCaptions }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText, bufferedText]);

  const formatTimestamp = (sec) => {
    if (typeof sec !== "number" || isNaN(sec)) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0 bg-surface">
      {transcript.map((turn) => {
        const info = PARTICIPANT_INFO[turn.speaker] || { color: "#9A9CA5" };
        const displayName = turn.speaker === "Student" ? "You" : turn.speaker;
        const timestamp = formatTimestamp(turn.started_at);

        return (
          <div
            key={turn.id}
            id={`turn-${turn.id}`}
            className="transcript-line flex items-start gap-3 rounded-md hover:bg-raised/60 transition-colors p-2"
          >
            {/* Timestamp in muted */}
            {timestamp && (
              <span className="font-mono text-[11px] text-muted shrink-0 mt-0.5 select-none">
                {timestamp}
              </span>
            )}

            {/* Speaker name in speaker color */}
            <span
              className="font-heading font-semibold text-xs sm:text-sm shrink-0 whitespace-nowrap"
              style={{ color: info.color }}
            >
              {displayName}:
            </span>

            {/* Text in ink */}
            <span className="text-xs sm:text-sm text-ink leading-relaxed font-body">
              {turn.text}
            </span>
          </div>
        );
      })}

      {/* Live speech captions: mono font, bottom, accent-colored caret on interim text */}
      {showCaptions && (bufferedText || interimText) && (
        <div className="transcript-line flex items-start gap-3 bg-raised border border-border border-l-4 border-l-accent rounded-md p-3 font-mono text-xs sm:text-sm">
          <span className="font-semibold shrink-0 text-accent font-heading">
            You (speaking):
          </span>
          <span className="text-ink leading-relaxed font-mono">
            {bufferedText ? `${bufferedText} ${interimText}`.trim() : interimText}
            {/* Accent-colored blinking caret */}
            <span className="inline-block w-2 h-3.5 bg-accent ml-1 animate-pulse align-middle" />
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
