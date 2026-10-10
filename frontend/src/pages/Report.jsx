import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PARTICIPANT_INFO } from "../lib/controller";
import { fetchReport } from "../lib/api";

/**
 * Report page – Speaking share, 6-category feedback with quoted moments.
 */
export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic, transcript, apiKey } = location.state || {};

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!transcript) {
      navigate("/");
      return;
    }

    const loadReport = async () => {
      try {
        const activeKey = apiKey || localStorage.getItem("gd_arena_gemini_key") || "";
        const data = await fetchReport({ topic, transcript, api_key: activeKey });
        setReport(data);
      } catch (err) {
        console.error("Report error:", err);
        setError("Failed to generate report. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center animate-fade-in-up">
          <div className="flex justify-center gap-2 mb-4">
            <div className="thinking-dot" />
            <div className="thinking-dot" />
            <div className="thinking-dot" />
          </div>
          <h2 className="text-xl font-semibold text-arena-text mb-2">Analyzing your performance...</h2>
          <p className="text-sm text-arena-text-muted">This may take 15-30 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md animate-fade-in-up">
          <p className="text-arena-danger mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 rounded-xl bg-arena-accent text-white hover:bg-arena-accent/80 transition-colors cursor-pointer"
          >
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  const { metrics, categories } = report;

  const categoryLabels = {
    starting: "Starting the Discussion",
    idea_quality: "Idea Quality",
    building_on_others: "Building on Others",
    listening: "Listening Skills",
    handling_interruptions: "Handling Interruptions",
    ending: "Ending / Final Contribution",
  };

  const categoryIcons = {
    starting: "🚀",
    idea_quality: "💡",
    building_on_others: "🤝",
    listening: "👂",
    handling_interruptions: "✋",
    ending: "🎯",
  };

  const scrollToTurn = (turnId) => {
    const el = document.getElementById(`turn-${turnId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-arena-accent to-arena-accent-glow bg-clip-text text-transparent">
            Your GD Report
          </h1>
          <p className="text-sm text-arena-text-muted mt-1">Topic: {topic}</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 rounded-xl bg-arena-accent text-white text-sm font-medium hover:bg-arena-accent/80 transition-colors cursor-pointer"
        >
          New Session
        </button>
      </div>

      {/* Speaking Share */}
      <div className="glass-card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-lg font-semibold mb-1">Speaking Share</h2>
        <p className="text-xs text-arena-text-muted mb-4">{metrics.denominator_note}</p>

        <div className="space-y-3">
          {metrics.speakers.map((s) => {
            const info = PARTICIPANT_INFO[s.name] || { color: "#888" };
            const displayName = s.name === "Student" ? "You" : s.name;
            return (
              <div key={s.name} className="flex items-center gap-4">
                <span
                  className="text-sm font-medium w-16 text-right"
                  style={{ color: info.color }}
                >
                  {displayName}
                </span>
                <div className="flex-1">
                  <div className="score-bar">
                    <div
                      className="score-bar-fill"
                      style={{
                        width: `${s.share_pct}%`,
                        background: `linear-gradient(90deg, ${info.color}, ${info.color}88)`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-arena-text-muted w-24 text-right">
                  <span className="font-semibold text-arena-text">{s.share_pct}%</span>
                  <span className="ml-2 text-xs">({s.turns} turns)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Cards */}
      <div className="space-y-4 mb-8">
        {categories.map((cat, i) => (
          <div
            key={cat.category}
            className="glass-card p-6 animate-fade-in-up"
            style={{ animationDelay: `${0.2 + i * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryIcons[cat.category] || "📝"}</span>
                <h3 className="text-lg font-semibold">
                  {categoryLabels[cat.category] || cat.category}
                </h3>
              </div>
              {cat.score !== null ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      cat.score >= 7
                        ? "text-arena-success"
                        : cat.score >= 4
                        ? "text-arena-warning"
                        : "text-arena-danger"
                    }`}
                  >
                    {cat.score}
                  </span>
                  <span className="text-sm text-arena-text-muted">/ 10</span>
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full bg-arena-surface-2 text-arena-text-muted text-sm">
                  N/A
                </span>
              )}
            </div>

            {/* Feedback */}
            <p className="text-sm text-arena-text/85 mb-3 leading-relaxed">
              {cat.feedback}
            </p>

            {/* Quote */}
            {cat.quote && (
              <div className="mb-3 pl-4 border-l-2 border-arena-accent/40">
                <p className="text-sm italic text-arena-accent-glow/80">
                  "{cat.quote}"
                </p>
              </div>
            )}

            {/* Jump to turn link */}
            {cat.turn_id && (
              <button
                onClick={() => scrollToTurn(cat.turn_id)}
                className="text-xs text-arena-accent hover:text-arena-accent-glow transition-colors cursor-pointer"
              >
                Jump to turn {cat.turn_id} →
              </button>
            )}

            {/* Suggestion */}
            {cat.suggestion && (
              <div className="mt-3 p-3 rounded-lg bg-arena-surface-2/50 border border-arena-border/50">
                <p className="text-xs text-arena-text-muted">
                  💡 <span className="text-arena-text/70">{cat.suggestion}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Transcript */}
      <div className="glass-card p-6 animate-fade-in-up">
        <h2 className="text-lg font-semibold mb-4">Full Transcript</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transcript.map((turn) => {
            const info = PARTICIPANT_INFO[turn.speaker] || { color: "#888" };
            return (
              <div
                key={turn.id}
                id={`turn-${turn.id}`}
                className="transcript-line flex gap-3 scroll-mt-20"
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
        </div>
      </div>
    </div>
  );
}
