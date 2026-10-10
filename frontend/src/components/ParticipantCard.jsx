import { PARTICIPANT_INFO } from "../lib/controller";

/**
 * ParticipantCard – Shows a panel member with their role,
 * AI tag, avatar ring, and 3-bar speaking indicator.
 * Idle cards are dimmed slightly; active speaker receives a 2px ring and soft glow.
 */
export default function ParticipantCard({ name, isSpeaking, isThinking, isStudent }) {
  const info = PARTICIPANT_INFO[name] || { role: "Participant", color: "#9A9CA5" };
  const displayName = name === "Student" ? "You" : name;

  return (
    <div
      className={`
        relative flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-card
        transition-all duration-200 min-w-[88px] sm:min-w-[100px] bg-surface
        ${isSpeaking
          ? "opacity-100 scale-[1.02] border-transparent"
          : "opacity-65 hover:opacity-90 border border-border"
        }
      `}
      style={{
        boxShadow: isSpeaking ? `0 0 16px ${info.color}33` : undefined,
        outline: isSpeaking ? `2px solid ${info.color}` : undefined,
        outlineOffset: isSpeaking ? "1px" : undefined,
      }}
    >
      {/* AI badge */}
      {!isStudent && (
        <span
          className="absolute -top-2 -right-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface border font-semibold"
          style={{ borderColor: `${info.color}60`, color: info.color }}
        >
          AI
        </span>
      )}

      {/* Avatar circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm bg-surface shrink-0"
        style={{
          border: `2px solid ${info.color}`,
          color: info.color,
        }}
      >
        {name === "Student" ? "Y" : name[0]}
      </div>

      {/* Name */}
      <span className="text-xs sm:text-sm font-semibold text-ink truncate max-w-full">
        {displayName}
      </span>

      {/* Personality / Role tag */}
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-full"
        style={{
          backgroundColor: `${info.color}18`,
          color: info.color,
          border: `1px solid ${info.color}40`,
        }}
      >
        {info.role}
      </span>

      {/* Animated 3-bar speaking indicator */}
      {isSpeaking && (
        <div className="speaking-indicator-3bar mt-0.5" style={{ color: info.color }}>
          <div className="speaking-bar-3" />
          <div className="speaking-bar-3" />
          <div className="speaking-bar-3" />
        </div>
      )}

      {/* Thinking dots */}
      {isThinking && !isSpeaking && (
        <div className="flex gap-1 mt-1">
          <div className="thinking-dot" />
          <div className="thinking-dot" />
          <div className="thinking-dot" />
        </div>
      )}
    </div>
  );
}
