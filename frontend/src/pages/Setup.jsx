import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PANEL_ORDER, PARTICIPANT_INFO, TOPIC_PRESETS, FORMAT_OPTIONS } from "../lib/controller";

/**
 * Setup page – Topic, panel size, duration, language, format, patience slider.
 * AI notice is always visible.
 */
export default function Setup() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [panelSize, setPanelSize] = useState(3);
  const [durationMin, setDurationMin] = useState(5);
  const [language, setLanguage] = useState("english");
  const [format, setFormat] = useState("general");
  const [patienceSec, setPatienceSec] = useState(1.5);

  const panel = PANEL_ORDER.slice(0, panelSize);
  const effectiveTopic = customTopic.trim() || topic;

  const handleEnter = () => {
    if (!effectiveTopic) return;
    navigate("/room", {
      state: {
        topic: effectiveTopic,
        panel,
        durationMin,
        language,
        format,
        patienceSec,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-2xl p-8 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-arena-accent to-arena-accent-glow bg-clip-text text-transparent">
            GD Arena
          </h1>
          <span className="text-sm text-arena-text-muted">Step 1 of 2: Set up room</span>
        </div>

        {/* AI Notice */}
        <div className="mb-6 p-4 rounded-xl bg-arena-accent/10 border border-arena-accent/30 flex gap-3 items-start">
          <span className="text-arena-warning text-xl shrink-0">⚠️</span>
          <p className="text-sm text-arena-text/90 leading-relaxed">
            All other participants and the moderator are <strong className="text-arena-accent-glow">AI</strong>, not real students.
            This is a practice environment to help you improve your group discussion skills.
          </p>
        </div>

        {/* Topic Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-arena-text-muted mb-3">Topic</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {TOPIC_PRESETS.map((t) => (
              <button
                key={t}
                onClick={() => { setTopic(t); setCustomTopic(""); }}
                className={`chip ${topic === t && !customTopic ? "active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type your own topic..."
            value={customTopic}
            onChange={(e) => { setCustomTopic(e.target.value); if (e.target.value) setTopic(""); }}
            className="w-full px-4 py-3 rounded-xl bg-arena-surface border border-arena-border text-arena-text placeholder-arena-text-muted/50 focus:outline-none focus:border-arena-accent transition-colors"
          />
        </div>

        {/* Config Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Panel Size */}
          <div>
            <label className="block text-sm font-medium text-arena-text-muted mb-2">AI Participants</label>
            <div className="flex gap-2">
              {[3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setPanelSize(n)}
                  className={`chip ${panelSize === n ? "active" : ""}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-arena-text-muted mb-2">Duration</label>
            <div className="flex gap-2">
              {[3, 5, 8].map((m) => (
                <button
                  key={m}
                  onClick={() => setDurationMin(m)}
                  className={`chip ${durationMin === m ? "active" : ""}`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-arena-text-muted mb-2">Language</label>
            <div className="flex gap-2">
              {["english", "hinglish"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`chip ${language === l ? "active" : ""}`}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Format */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-arena-text-muted mb-2">Discussion Format</label>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`chip ${format === f.value ? "active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-arena-text-muted mb-3">Your Panel</label>
          <div className="flex gap-3 flex-wrap">
            {panel.map((name) => {
              const info = PARTICIPANT_INFO[name];
              return (
                <div
                  key={name}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-arena-surface border border-arena-border"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: info.color + "33", border: `2px solid ${info.color}` }}
                  >
                    {name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-[11px] text-arena-text-muted">{info.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Patience Slider */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-arena-text-muted mb-2">
            Patience before AI speaks
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.5"
              value={patienceSec}
              onChange={(e) => setPatienceSec(parseFloat(e.target.value))}
              className="flex-1 accent-arena-accent h-2 cursor-pointer"
            />
            <span className="text-sm font-mono text-arena-accent-glow min-w-[40px] text-right">
              {patienceSec}s
            </span>
          </div>
          <p className="text-[11px] text-arena-text-muted mt-1">
            How long to wait after you stop speaking before an AI responds
          </p>
        </div>

        {/* Enter Room Button */}
        <button
          onClick={handleEnter}
          disabled={!effectiveTopic}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300
            ${effectiveTopic
              ? "bg-gradient-to-r from-arena-accent to-purple-500 text-white hover:shadow-lg hover:shadow-arena-accent/30 hover:scale-[1.02] cursor-pointer"
              : "bg-arena-surface-2 text-arena-text-muted cursor-not-allowed"
            }
          `}
        >
          Enter Room →
        </button>
      </div>
    </div>
  );
}
