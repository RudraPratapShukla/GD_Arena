import { useEffect, useRef } from "react";
import { PARTICIPANT_INFO } from "../lib/controller";

/**
 * TranscriptPanel – Scrollable transcript with live captions.
 * Each turn has id="turn-{id}" for Report jump-to-turn links.
 */
export default function TranscriptPanel({ transcript, interimText, showCaptions }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText]);

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

      {/* Live interim text (muted) */}
      {showCaptions && interimText && (
        <div className="transcript-line flex gap-3 opacity-50">
          <span
            className="font-semibold text-sm whitespace-nowrap shrink-0"
            style={{ color: PARTICIPANT_INFO.Student.color }}
          >
            You (live):
          </span>
          <span className="text-sm italic">{interimText}</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
