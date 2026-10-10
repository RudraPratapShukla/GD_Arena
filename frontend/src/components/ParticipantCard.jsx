import { PARTICIPANT_INFO } from "../lib/controller";

/**
 * ParticipantCard – Shows a panel member with their role,
 * AI tag, and speaking indicator.
 */
export default function ParticipantCard({ name, isSpeaking, isThinking, isStudent }) {
  const info = PARTICIPANT_INFO[name] || { role: "Participant", color: "#888" };

  return (
    <div
      className={`
        relative flex flex-col items-center gap-1 px-4 py-3 rounded-xl
        transition-all duration-300 min-w-[90px]
        ${isSpeaking
          ? "bg-arena-surface-2 border-2 scale-105 shadow-lg"
          : "bg-arena-surface border border-arena-border"
        }
      `}
      style={{
        borderColor: isSpeaking ? info.color : undefined,
        boxShadow: isSpeaking ? `0 0 20px ${info.color}33` : undefined,
      }}
    >
      {/* AI badge */}
      {!isStudent && (
        <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-arena-accent/20 text-arena-accent-glow border border-arena-accent/30 font-medium">
          AI
        </span>
      )}

      {/* Avatar circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
        style={{ backgroundColor: info.color + "33", border: `2px solid ${info.color}` }}
      >
        {name === "Student" ? "You" : name[0]}
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-arena-text">{name === "Student" ? "You" : name}</span>

      {/* Role */}
      <span className="text-[11px] text-arena-text-muted">{info.role}</span>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="speaking-indicator" style={{ color: info.color }}>
          <div className="speaking-bar" style={{ height: "12px" }} />
          <div className="speaking-bar" style={{ height: "16px" }} />
          <div className="speaking-bar" style={{ height: "10px" }} />
          <div className="speaking-bar" style={{ height: "14px" }} />
        </div>
      )}

      {/* Thinking indicator */}
      {isThinking && !isSpeaking && (
        <div className="flex gap-1">
          <div className="thinking-dot" />
          <div className="thinking-dot" />
          <div className="thinking-dot" />
        </div>
      )}
    </div>
  );
}
