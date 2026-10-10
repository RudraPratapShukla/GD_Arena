import { useEffect, useRef } from "react";
import { PARTICIPANT_INFO } from "../lib/controller";

/**
 * TranscriptPanel – Scrollable transcript with live captions.
 * Each turn has id="turn-{id}" for Report jump-to-turn links.
 */
export default function TranscriptPanel({ transcript, interimText, bufferedText, showCaptions }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText, bufferedText]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
      {transcript.map((turn) => {
        const info = PARTICIPANT_INFO[turn.speaker] || { color: "#888" };
        return (
          <div
            key={turn.id}
            id={`turn-${turn.id}`}
            className="transcript-line flex gap-3"
          >
            <span
              className="font-semibold text-sm whitespace-nowrap shrink-0"
              style={{ color: info.color }}
            >
              {turn.speaker === "Student" ? "You" : turn.speaker}:
            </span>
            <span className="text-sm text-arena-text/90">{turn.text}</span>
          </div>
        );
      })}

      {/* Live speech buffer / interim text */}
      {showCaptions && (bufferedText || interimText) && (
        <div className="transcript-line flex gap-3 bg-arena-accent/10 border border-arena-accent/30 rounded-lg p-2.5 animate-pulse">
          <span
            className="font-semibold text-sm whitespace-nowrap shrink-0 text-arena-accent-glow"
          >
            You (speaking...):
          </span>
          <span className="text-sm italic text-arena-text">
            {bufferedText ? `${bufferedText} ${interimText}`.trim() : interimText}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
