import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cpu,
  Radio,
  Activity,
  Sparkles,
  ShieldCheck,
  Terminal,
  Sliders,
  Globe,
  Users,
  Clock,
  Zap,
  ChevronRight,
  Play,
  Volume2,
  Layers,
  Bot,
  Flame,
  Check,
  Info
} from "lucide-react";
import { PANEL_ORDER, PARTICIPANT_INFO, TOPIC_PRESETS, FORMAT_OPTIONS } from "../lib/controller";

const TOPIC_CATEGORIES = [
  { tag: "TECH / AI", label: "Technology & Employment" },
  { tag: "SOCIO-DIGITAL", label: "Culture & Platforms" },
  { tag: "PHILOSOPHICAL", label: "Abstract Concept" },
  { tag: "BUSINESS CASE", label: "Corporate Dilemma" },
];

export default function Setup() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("Should AI replace human jobs?");
  const [customTopic, setCustomTopic] = useState("");
  const [panelSize, setPanelSize] = useState(3);
  const [durationMin, setDurationMin] = useState(5);
  const [language, setLanguage] = useState("english");
  const [format, setFormat] = useState("general");
  const [patienceSec, setPatienceSec] = useState(2.5);
  const [timecode, setTimecode] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimecode(
        now.toTimeString().split(" ")[0] +
        "." +
        String(Math.floor(now.getMilliseconds() / 100))
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen w-full arena-grid-bg text-ink flex flex-col justify-between font-body select-none relative overflow-x-hidden">
      {/* Top Laser Accent Line */}
      <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-80" />

      {/* TOP HEADER */}
      <header className="w-full border-b border-border bg-[#0E0F12]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 z-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand & System Code */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-lg bg-surface border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(200,245,69,0.15)]">
              <Cpu className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black tracking-widest text-lg text-ink">
                  GD <span className="text-accent">ARENA</span> AI
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent font-semibold tracking-wider">
                  PRACTICE SUITE
                </span>
              </div>
              <p className="text-[11px] text-muted font-mono tracking-tight flex items-center gap-2">
                <span>AI-POWERED GROUP DISCUSSION PRACTICE</span>
                <span className="text-border">|</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  ONLINE
                </span>
              </p>
            </div>
          </div>

          {/* Session Info Strip */}
          <div className="hidden xl:flex items-center gap-5 text-xs font-mono text-muted bg-surface/60 border border-border px-4 py-1.5 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-accent" />
              <span>PEERS: <strong className="text-ink">{panelSize} AI Participants</strong></span>
            </div>
            <span className="text-border">/</span>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-meera" />
              <span>DURATION: <strong className="text-ink">{durationMin} min</strong></span>
            </div>
            <span className="text-border">/</span>
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-kabir" />
              <span>LANGUAGE: <strong className="text-ink">{language === "hinglish" ? "Hinglish" : "English"}</strong></span>
            </div>
          </div>

          {/* Clock & Status */}
          <div className="flex items-center gap-3">
            <div className="text-right font-mono">
              <div className="text-xs text-accent font-semibold tracking-wider flex items-center justify-end gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{timecode || "14:20:00.0"}</span>
              </div>
              <div className="text-[10px] text-muted uppercase tracking-wider">SYSTEM READY</div>
            </div>
            <div className="h-7 w-[1px] bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-raised border border-border text-[11px] font-mono text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>EVALUATION PROTOCOL</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN COMMAND CENTER GRID */}
      <main className="w-full flex-1 px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ========================================================
            COLUMN 1: MISSION PARAMETERS & TOPIC MATRIX (COL-SPAN-4)
           ======================================================== */}
        <section className="lg:col-span-4 flex flex-col gap-5">
          {/* Topic Matrix Panel */}
          <div className="hud-panel hud-corner-bracket p-5 flex flex-col justify-between flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm bg-accent" />
                  <h2 className="font-heading font-bold text-sm tracking-wider uppercase text-ink">
                    01 // Discussion Topic
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
                  SELECT
                </span>
              </div>

              {/* Topic Presets with Category tags */}
              <div className="space-y-2 mb-4">
                <label className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Topic Presets</span>
                  <span className="text-[10px] text-accent">SELECT OR CUSTOMIZE</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {TOPIC_PRESETS.map((t, idx) => {
                    const isSelected = topic === t && !customTopic;
                    const cat = TOPIC_CATEGORIES[idx] || { tag: "GENERAL", label: "Discourse" };
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTopic(t);
                          setCustomTopic("");
                        }}
                        className={`group relative text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                          isSelected
                            ? "bg-raised border-accent text-ink shadow-[0_0_15px_rgba(200,245,69,0.08)]"
                            : "bg-surface/70 border-border text-muted hover:border-border/80 hover:text-ink hover:bg-raised"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                              isSelected
                                ? "bg-accent/20 text-accent border border-accent/40"
                                : "bg-raised text-muted border border-border"
                            }`}
                          >
                            {cat.tag}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-accent">
                              <Check className="w-3 h-3" /> SELECTED
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-ink group-hover:text-ink text-[13px] leading-snug">
                          {t}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Topic Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Custom Topic</span>
                  <span className="text-[10px] font-mono text-muted">
                    {customTopic ? `${customTopic.length} CHARS` : "CUSTOM PROMPT"}
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Terminal className="w-4 h-4 text-accent/70" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter custom topic or problem statement..."
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      if (e.target.value) setTopic("");
                    }}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface border border-border text-ink placeholder-muted/50 text-xs sm:text-sm font-body focus:border-accent focus:bg-raised focus:outline-none transition-all"
                  />
                  {customTopic && (
                    <button
                      type="button"
                      onClick={() => setCustomTopic("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-mono text-muted hover:text-danger"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Discussion Format Selector */}
            <div className="pt-3 border-t border-border">
              <label className="block text-[11px] font-mono text-muted uppercase tracking-wider mb-2">
                Discussion Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((f) => {
                  const isSelected = format === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFormat(f.value)}
                      className={`p-2 rounded-lg border text-xs font-mono text-center transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-accent/15 border-accent text-accent font-semibold"
                          : "bg-surface border-border text-muted hover:text-ink hover:bg-raised"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-accent" : "bg-muted/40"}`} />
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            COLUMN 2: AI DISCUSSION ENGINE & AUDIO SYNTHESIS (COL-SPAN-4)
           ======================================================== */}
        <section className="lg:col-span-4 flex flex-col gap-5">
          {/* AI Audio Visualizer */}
          <div className="hud-panel hud-corner-bracket p-5 flex flex-col items-center justify-between flex-1 relative overflow-hidden">
            {/* Ambient Scanline overlay */}
            <div className="absolute inset-0 hud-scanline pointer-events-none opacity-40" />

            {/* Header */}
            <div className="w-full flex items-center justify-between border-b border-border pb-3 z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-accent" />
                <h2 className="font-heading font-bold text-sm tracking-wider uppercase text-ink">
                  02 // AI Discussion Engine
                </h2>
              </div>
              <span className="text-[10px] font-mono text-accent uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                ACTIVE
              </span>
            </div>

            {/* Central Animated Arc Reactor / Hologram */}
            <div className="relative my-6 flex flex-col items-center justify-center z-10">
              {/* Outer rotating dashed ring */}
              <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/25 animate-spin-slow" />
                
                {/* Secondary counter-rotating segmented ring */}
                <div className="absolute inset-4 rounded-full border border-meera/30 border-t-transparent border-b-transparent animate-spin-reverse" />
                
                {/* Third geometric ring with angle markers */}
                <div className="absolute inset-8 rounded-full border border-border/80" />
                
                {/* Glowing Core */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-surface via-raised to-surface border border-accent/60 flex flex-col items-center justify-center text-center p-3 shadow-[0_0_35px_rgba(200,245,69,0.18)] animate-pulse-glow">
                  <div className="w-2 h-2 rounded-full bg-accent mb-1 animate-ping" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase">
                    GD ARENA
                  </span>
                  <span className="text-[9px] font-mono text-muted uppercase tracking-tight">
                    {panelSize} PEERS READY
                  </span>
                  <span className="text-[8px] font-mono text-meera tracking-wider mt-0.5">
                    {language.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Dynamic Soundwave Spectrum Bars beneath Reactor */}
              <div className="flex items-end justify-center gap-1.5 h-8 mt-2">
                <div className="w-1 bg-accent rounded-full eq-bar-1" />
                <div className="w-1 bg-meera rounded-full eq-bar-2" />
                <div className="w-1 bg-kabir rounded-full eq-bar-3" />
                <div className="w-1 bg-accent rounded-full eq-bar-4" />
                <div className="w-1 bg-riya rounded-full eq-bar-5" />
                <div className="w-1 bg-dev rounded-full eq-bar-6" />
                <div className="w-1 bg-meera rounded-full eq-bar-2" />
                <div className="w-1 bg-accent rounded-full eq-bar-1" />
                <div className="w-1 bg-kabir rounded-full eq-bar-4" />
              </div>
              <span className="text-[10px] font-mono text-muted tracking-widest mt-2 uppercase">
                VOICE SYNTHESIS // READY
              </span>
            </div>

            {/* Telemetry Controls: Timing, Language, Duration */}
            <div className="w-full space-y-4 pt-4 border-t border-border z-10">
              {/* Patience / Latency Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-accent" />
                    AI Response Timing
                  </span>
                  <span className="font-mono text-accent bg-surface px-2 py-0.5 rounded border border-accent/40 font-bold">
                    {patienceSec}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={patienceSec}
                  onChange={(e) => setPatienceSec(parseFloat(e.target.value))}
                  className="w-full accent-accent h-2 bg-surface rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted px-0.5">
                  <span>FAST (1.0s)</span>
                  <span>NATURAL (2.5s)</span>
                  <span>DELIBERATE (4.0s)</span>
                </div>
              </div>

              {/* Duration & Language Matrix */}
              <div className="grid grid-cols-2 gap-3">
                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-accent" />
                    Session Duration
                  </label>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1">
                    {[3, 5, 8].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMin(m)}
                        className={`py-1.5 text-xs font-mono rounded font-semibold transition-all ${
                          durationMin === m
                            ? "bg-accent text-[#0E0F12]"
                            : "text-muted hover:text-ink hover:bg-raised"
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-3 h-3 text-meera" />
                    Language
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
                    {[
                      { id: "english", label: "EN" },
                      { id: "hinglish", label: "HINGLISH" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLanguage(item.id)}
                        className={`py-1.5 text-xs font-mono rounded font-semibold transition-all ${
                          language === item.id
                            ? "bg-accent text-[#0E0F12]"
                            : "text-muted hover:text-ink hover:bg-raised"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            COLUMN 3: AUTONOMOUS AGENT NETWORK PODS (COL-SPAN-4)
           ======================================================== */}
        <section className="lg:col-span-4 flex flex-col gap-5">
          <div className="hud-panel hud-corner-bracket p-5 flex flex-col justify-between flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm bg-accent" />
                  <h2 className="font-heading font-bold text-sm tracking-wider uppercase text-ink">
                    03 // AI Participants
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
                  {panelSize} / 5 ACTIVE
                </span>
              </div>

              {/* Panel Size Selector */}
              <div className="space-y-1.5 mb-4">
                <label className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Panel Size</span>
                  <span className="text-[10px] text-accent font-mono">AI PEERS</span>
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1">
                  {[3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPanelSize(n)}
                      className={`py-2 text-xs font-mono rounded font-semibold transition-all ${
                        panelSize === n
                          ? "bg-accent text-[#0E0F12]"
                          : "text-muted hover:text-ink hover:bg-raised"
                      }`}
                    >
                      {n} PEERS
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Roster Pod Cards */}
              <div className="space-y-2.5">
                {PANEL_ORDER.map((name, index) => {
                  const info = PARTICIPANT_INFO[name];
                  const isInRoom = index < panelSize;
                  return (
                    <div
                      key={name}
                      className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isInRoom
                          ? "bg-surface border-border hover:bg-raised shadow-sm"
                          : "bg-surface/30 border-border/40 opacity-40"
                      }`}
                      style={{
                        borderLeftWidth: isInRoom ? "3px" : "1px",
                        borderLeftColor: isInRoom ? info.color : undefined,
                      }}
                    >
                      {/* Avatar Ring */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-surface shrink-0"
                          style={{
                            border: `2px solid ${info.color}`,
                            color: info.color,
                            boxShadow: isInRoom ? `0 0 10px ${info.color}30` : "none",
                          }}
                        >
                          {name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-ink truncate">
                              {name}
                            </span>
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold"
                              style={{
                                backgroundColor: `${info.color}15`,
                                color: info.color,
                                border: `1px solid ${info.color}35`,
                              }}
                            >
                              {info.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted truncate mt-0.5">
                            {info.trait}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0 text-right">
                        {isInRoom ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full animate-pulse"
                              style={{ backgroundColor: info.color }}
                            />
                            <span className="text-[10px] font-mono font-semibold" style={{ color: info.color }}>
                              READY
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-muted">
                            STANDBY
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Moderator Footer Note */}
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted font-mono">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ border: `1px solid ${PARTICIPANT_INFO.Moderator.color}`, color: PARTICIPANT_INFO.Moderator.color }}
                >
                  M
                </div>
                <span>MODERATOR: FAIR FACILITATOR & BALANCER</span>
              </div>
              <span className="text-accent text-[11px] font-bold">READY</span>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================
          STICKY FULL-WIDTH LAUNCH & TELEMETRY DECK
         ======================================================== */}
      <footer className="w-full border-t border-border bg-[#0E0F12]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 z-30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Mission Readiness Status */}
          <div className="flex items-center gap-4 text-xs font-mono w-full sm:w-auto">
            <div className="flex items-center gap-2 text-accent">
              <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
              <span className="font-bold tracking-wider">READY:</span>
            </div>
            <div className="text-ink truncate max-w-md bg-surface px-3 py-1.5 rounded border border-border">
              <span className="text-muted">TOPIC: </span>
              <strong className="text-accent font-semibold">{effectiveTopic || "NONE SPECIFIED"}</strong>
            </div>
            <div className="hidden md:flex items-center gap-3 text-muted">
              <span>•</span>
              <span>{panelSize} AI PEERS</span>
              <span>•</span>
              <span>{durationMin} MINUTES</span>
              <span>•</span>
              <span className="uppercase">{language}</span>
            </div>
          </div>

          {/* Launch CTA */}
          <button
            type="button"
            onClick={handleEnter}
            disabled={!effectiveTopic}
            className={`
              w-full sm:w-auto min-w-[280px] py-3.5 px-8 rounded-xl font-heading font-bold text-sm sm:text-base tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-3 min-h-[48px]
              ${
                effectiveTopic
                  ? "bg-accent text-[#0E0F12] hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(200,245,69,0.35)] active:scale-[0.98] cursor-pointer"
                  : "bg-surface border border-border text-muted cursor-not-allowed"
              }
            `}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Discussion</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </footer>
    </div>
  );
}
