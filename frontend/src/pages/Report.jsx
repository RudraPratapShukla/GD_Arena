import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  RotateCcw,
  Sparkles,
  Clock,
  Mic,
  Compass,
  Target,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
} from "lucide-react";
import { PARTICIPANT_INFO } from "../lib/controller";
import { fetchReport } from "../lib/api";

/**
 * Report page – Ink & Signal Studio Palette.
 * Features:
 * - AI Communication Coach with 4 Key Pillars:
 *   1. Speaking time and participation balance
 *   2. Filler words analysis ("umm", "actually", "like")
 *   3. Clarity, structure, and relevance of arguments (collaborative vs combative)
 *   4. Exactly what to improve in your next GD (Action Playbook)
 * - Talk share stacked horizontal bar (% + turns + words + performance rating out of 10)
 * - 7 Structured placement GD feedback cards with clickable quote chips that jump to transcript
 * - Embedded transcript with highlighted jumping
 */
export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic, transcript, apiKey } = location.state || {};

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedTurnId, setHighlightedTurnId] = useState(null);

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

  const scrollToTurn = (turnId) => {
    if (!turnId) return;
    setHighlightedTurnId(turnId);
    const el = document.getElementById(`turn-${turnId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      setHighlightedTurnId((current) => (current === turnId ? null : current));
    }, 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-4 font-body">
        <div className="surface-card p-10 text-center animate-fade-in-up max-w-md w-full space-y-4">
          <div className="flex justify-center gap-2 mb-2">
            <div className="thinking-dot" />
            <div className="thinking-dot" />
            <div className="thinking-dot" />
          </div>
          <h2 className="text-xl font-heading font-semibold text-ink">Analyzing Discussion Data...</h2>
          <p className="text-xs text-muted leading-relaxed">
            AI Communication Coach is synthesizing speaking balance, auditing filler words, argument architecture, and generating your next GD playbook.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-4 font-body">
        <div className="surface-card p-8 text-center max-w-md w-full animate-fade-in-up space-y-4">
          <p className="text-danger text-sm font-medium">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-lg bg-surface border border-border text-ink hover:bg-raised transition-colors text-sm font-medium cursor-pointer"
          >
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  const { metrics = {}, categories = [], coach = null } = report || {};
  const speakers = metrics.speakers || [];

  const speakingTime = coach?.speaking_time || {
    share_pct: 20,
    ideal_range: "18% – 25%",
    status: "Well-Balanced",
    critique: "Maintained a strong collaborative cadence without dominating.",
    student_seconds: 0,
    student_words: 0,
    student_turns: 0,
  };

  const fillerWords = coach?.filler_words || {
    total_count: 0,
    rate_per_100_words: 0,
    status: "Crisp & Clean Cadence",
    critique: "Zero noticeable filler words detected.",
    breakdown: {},
    examples: [],
  };

  const argumentClarity = coach?.argument_clarity || {
    score: 8.0,
    status: "Structured & Collaborative",
    critique: "Logical argument flow with high topic relevance.",
    is_on_topic: true,
    is_collaborative: true,
    is_combative: false,
  };

  const nextGdPlan = coach?.next_gd_action_plan || [];

  const categoryLabels = {
    starting: "Topic Encounter & Framing",
    idea_quality: "Topic Understanding & Focus",
    building_on_others: "Building on Others (Collaborative Mindset)",
    speech_delivery: "Way of Speaking & Sentence Clarity",
    listening: "Active Listening",
    handling_interruptions: "Handling Interruptions",
    ending: "Discussion Closure & Final Takeaways",
  };

  const orderedCategoryKeys = [
    "starting",
    "idea_quality",
    "building_on_others",
    "speech_delivery",
    "listening",
    "handling_interruptions",
    "ending",
  ];

  const sortedCategories = [...categories].sort((a, b) => {
    const idxA = orderedCategoryKeys.indexOf(a.category);
    const idxB = orderedCategoryKeys.indexOf(b.category);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  return (
    <div className="min-h-screen bg-bg text-ink p-4 sm:p-6 max-w-4xl mx-auto font-body space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 animate-fade-in-up">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-muted">Performance Assessment</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-ink tracking-tight mt-0.5">
            Discussion Report
          </h1>
          <p className="text-xs text-muted mt-1 max-w-2xl">
            Topic: <span className="text-ink font-medium">"{topic}"</span>
          </p>
        </div>

        {/* Action Buttons: Secondary outline + Accent CTA */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-ink hover:bg-raised transition-colors text-xs sm:text-sm font-medium cursor-pointer min-h-[40px] flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted" />
            New session
          </button>
          <button
            onClick={() => navigate("/", { state: { prefillTopic: topic } })}
            className="px-4 py-2 rounded-lg bg-accent text-[#0E0F12] hover:opacity-90 transition-opacity text-xs sm:text-sm font-semibold cursor-pointer min-h-[40px] shadow-sm flex items-center gap-1.5"
          >
            Practice Topic Again →
          </button>
        </div>
      </div>

      {/* ========================================================
          AI COMMUNICATION COACH SECTION (HIGH PRIORITY)
         ======================================================== */}
      <section className="space-y-4 animate-fade-in-up">
        {/* Coach Executive Banner */}
        <div className="surface-card p-5 sm:p-6 border-l-4 border-l-accent space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/40 flex items-center justify-center text-accent">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-heading font-bold text-ink">
                  AI Communication Coach
                </h2>
                <p className="text-xs text-muted">
                  Personalized performance analysis & targeted next-round coaching
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-accent text-[#0E0F12] font-bold uppercase tracking-wider">
              Live Coach Audit
            </span>
          </div>

          {coach?.executive_summary && (
            <p className="text-xs sm:text-sm text-ink leading-relaxed font-body bg-surface p-3.5 rounded-lg border border-border">
              "{coach.executive_summary}"
            </p>
          )}
        </div>

        {/* 3 Core Communication Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Speaking Time & Balance */}
          <div className="surface-card p-5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Speaking Balance
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    speakingTime.status.includes("Well-Balanced") || speakingTime.status.includes("Optimal")
                      ? "bg-success/15 text-success border border-success/30"
                      : "bg-warn/15 text-warn border border-warn/30"
                  }`}
                >
                  {speakingTime.status}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-heading font-bold text-ink">
                  {speakingTime.share_pct}%
                </span>
                <span className="text-xs font-mono text-muted">talk share</span>
              </div>

              <div className="text-[11px] font-mono text-muted mt-1">
                Ideal GD Target: <strong className="text-ink">{speakingTime.ideal_range}</strong>
              </div>

              <p className="text-xs text-muted leading-relaxed mt-2.5 font-body">
                {speakingTime.critique}
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted">
              <span>{speakingTime.student_seconds}s spoken</span>
              <span>•</span>
              <span>{speakingTime.student_words} words</span>
              <span>•</span>
              <span>{speakingTime.student_turns} turns</span>
            </div>
          </div>

          {/* Pillar 2: Filler Words Analysis ("umm", "actually", "like") */}
          <div className="surface-card p-5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-meera" />
                  Filler Words
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    fillerWords.total_count === 0
                      ? "bg-success/15 text-success border border-success/30"
                      : fillerWords.total_count <= 3
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-warn/15 text-warn border border-warn/30"
                  }`}
                >
                  {fillerWords.status}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`text-3xl font-heading font-bold ${
                    fillerWords.total_count === 0 ? "text-success" : "text-ink"
                  }`}
                >
                  {fillerWords.total_count}
                </span>
                <span className="text-xs font-mono text-muted">detected</span>
              </div>

              <div className="text-[11px] font-mono text-muted mt-1">
                Density: <strong className="text-ink">{fillerWords.rate_per_100_words}</strong> per 100 words
              </div>

              {/* Breakdown chips */}
              {Object.keys(fillerWords.breakdown || {}).length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {Object.entries(fillerWords.breakdown).map(([word, count]) => (
                    <span
                      key={word}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-raised border border-border text-ink"
                    >
                      "{word}" × {count}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-2.5 text-xs text-success font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> No habitual filler words detected
                </div>
              )}

              <p className="text-xs text-muted leading-relaxed mt-2 font-body">
                {fillerWords.critique}
              </p>
            </div>

            {/* Snippet preview if available */}
            {fillerWords.examples && fillerWords.examples.length > 0 ? (
              <div className="pt-2.5 border-t border-border">
                <span className="text-[10px] font-mono text-muted uppercase">Turn {fillerWords.examples[0].turn_id} instance:</span>
                <div className="text-[11px] font-mono text-ink italic truncate mt-0.5">
                  {fillerWords.examples[0].snippet}
                </div>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-border text-[11px] font-mono text-success">
                Vocal cadence: Composed & Fluent
              </div>
            )}
          </div>

          {/* Pillar 3: Clarity, Structure & Relevance */}
          <div className="surface-card p-5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-kabir" />
                  Argument Clarity
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    argumentClarity.score >= 8
                      ? "bg-success/15 text-success border border-success/30"
                      : argumentClarity.score >= 6
                      ? "bg-warn/15 text-warn border border-warn/30"
                      : "bg-danger/15 text-danger border border-danger/30"
                  }`}
                >
                  {argumentClarity.status}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-heading font-bold text-ink">
                  {argumentClarity.score !== null ? argumentClarity.score.toFixed(1) : "N/A"}
                </span>
                <span className="text-xs font-mono text-muted">/ 10 structure score</span>
              </div>

              <div className="space-y-1 mt-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      argumentClarity.is_on_topic ? "bg-success" : "bg-danger"
                    }`}
                  />
                  <span className="text-muted">Topic Relevance:</span>
                  <strong className="text-ink">
                    {argumentClarity.is_on_topic ? "Anchored to Prompt" : "Risk of Diverting"}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !argumentClarity.is_combative ? "bg-success" : "bg-danger"
                    }`}
                  />
                  <span className="text-muted">GD Tone:</span>
                  <strong className="text-ink">
                    {argumentClarity.is_combative ? "Combative Debating" : "Collaborative Consensus"}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-muted leading-relaxed mt-2 font-body">
                {argumentClarity.critique}
              </p>
            </div>

            <div className="pt-3 border-t border-border text-[11px] font-mono text-accent">
              Formula: PREP (Point → Reason → Example → Point)
            </div>
          </div>
        </div>

        {/* ========================================================
            UNIQUE TWIST: EXACTLY WHAT TO IMPROVE IN YOUR NEXT GD
           ======================================================== */}
        <div className="surface-card p-5 sm:p-6 border border-border border-l-4 border-l-accent space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                <h3 className="text-base sm:text-lg font-heading font-bold text-ink">
                  What to Improve in Your Next GD
                </h3>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Instead of just giving a score, the AI tells you exactly what behavioral targets to execute in your next round:
              </p>
            </div>
            <span className="text-xs font-mono text-accent px-2.5 py-1 rounded bg-raised border border-border shrink-0 font-semibold">
              🎯 Next GD Playbook
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {nextGdPlan.map((item, idx) => (
              <div
                key={item.step || idx}
                className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-3 hover:bg-raised transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent text-[#0E0F12] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {item.step || idx + 1}
                    </span>
                    <h4 className="font-heading font-semibold text-xs sm:text-sm text-ink leading-tight">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted leading-relaxed mt-2.5 font-body">
                    {item.action}
                  </p>
                </div>

                {item.example_phrase && (
                  <div className="p-2.5 rounded bg-raised border border-border font-mono text-[11px] text-accent leading-relaxed">
                    <span className="text-[10px] text-muted block uppercase mb-1 font-sans font-semibold">
                      Verbal Formula to speak:
                    </span>
                    {item.example_phrase}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          TALK SHARE & PARTICIPANT RATINGS OUT OF 10
         ======================================================== */}
      <div className="surface-card p-5 sm:p-6 animate-fade-in-up space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-heading font-semibold text-ink">
              Participant Performance & Talk Share
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Individual evaluation out of 10 and spoken time across all participants (moderator excluded)
            </p>
          </div>
          <span className="text-xs font-mono text-muted px-2 py-0.5 rounded bg-raised border border-border">
            scored out of 10
          </span>
        </div>

        {/* Stacked Horizontal Bar */}
        <div className="h-4 w-full rounded-md overflow-hidden flex bg-raised border border-border">
          {speakers.map((s) => {
            const info = PARTICIPANT_INFO[s.name] || { color: "#9A9CA5" };
            const pct = s.share_pct || 0;
            if (pct <= 0) return null;
            return (
              <div
                key={s.name}
                style={{
                  width: `${pct}%`,
                  backgroundColor: info.color,
                }}
                className="h-full transition-all duration-300 relative group cursor-pointer"
                title={`${s.name === "Student" ? "You" : s.name}: ${s.score || 8.0}/10 • ${pct}% (${s.words} words)`}
              />
            );
          })}
        </div>

        {/* Breakdown Grid showing Score / 10 + % + turns + words */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
          {speakers.map((s) => {
            const info = PARTICIPANT_INFO[s.name] || { color: "#9A9CA5", role: "Participant" };
            const isStudent = s.name === "Student";
            const displayName = isStudent ? "You" : s.name;
            const pct = s.share_pct || 0;
            const scoreVal = s.score !== null && s.score !== undefined ? Number(s.score).toFixed(1) : "8.0";

            return (
              <div
                key={s.name}
                className="p-3 rounded-lg bg-surface border border-border flex flex-col justify-between gap-1 hover:bg-raised transition-colors"
                style={{
                  borderTop: `2px solid ${info.color}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: info.color }}
                  />
                  <span className="font-heading font-semibold text-xs text-ink truncate">
                    {displayName}
                  </span>
                  {!isStudent && (
                    <span className="text-[10px] text-muted truncate">
                      ({info.role})
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1.5">
                  <div className="flex items-baseline gap-1 font-heading font-bold text-sm" style={{ color: info.color }}>
                    <span>{scoreVal}</span>
                    <span className="text-[10px] font-mono text-muted">/10</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted">{pct}%</span>
                </div>

                <div className="text-[10px] font-mono text-muted mt-0.5 truncate">
                  {s.turns}t • {s.words}w
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted font-mono pt-1">
          * {metrics.denominator_note || "Talk share is calculated across all participants (moderator excluded)."}
        </p>
      </div>

      {/* ========================================================
          CATEGORY FEEDBACK CARDS (DETAILED DIMENSIONS)
         ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-heading font-semibold text-ink">
              Detailed Placement GD Dimensions
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Click quote chips to inspect transcript moments and verify feedback
            </p>
          </div>
          <span className="text-xs font-mono text-muted">
            {sortedCategories.length} categories
          </span>
        </div>

        {sortedCategories.map((cat, i) => {
          const score = cat.score;
          const scoreColor =
            score === null || score === undefined
              ? "text-muted"
              : score >= 8
              ? "text-success"
              : score >= 6
              ? "text-warn"
              : "text-danger";

          return (
            <div
              key={cat.category}
              className="surface-card p-5 sm:p-6 animate-fade-in-up space-y-3"
              style={{ animationDelay: `${0.1 + i * 0.05}s` }}
            >
              {/* Category Header with Score Badge (or N/A) */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-heading font-semibold text-ink">
                  {categoryLabels[cat.category] || cat.category}
                </h3>
                <div>
                  {score !== null && score !== undefined ? (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-heading font-bold ${scoreColor}`}>
                        {typeof score === "number" ? score.toFixed(1) : score}
                      </span>
                      <span className="text-xs font-mono text-muted">/ 10</span>
                    </div>
                  ) : (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-raised text-muted border border-border">
                      N/A
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback text */}
              <p className="text-xs sm:text-sm text-ink leading-relaxed font-body">
                {cat.feedback}
              </p>

              {/* Clickable Quote Chip */}
              {cat.quote && (
                <button
                  type="button"
                  onClick={() => scrollToTurn(cat.turn_id)}
                  className="w-full text-left font-mono text-xs p-3 rounded-r-lg bg-raised/80 border border-border border-l-4 border-l-accent text-ink hover:bg-raised transition-colors cursor-pointer group flex items-start justify-between gap-3 min-h-[40px]"
                  title="Click to jump to turn in transcript"
                >
                  <span className="italic leading-relaxed flex-1">
                    "{cat.quote}"
                  </span>
                  {cat.turn_id && (
                    <span className="text-[11px] font-mono text-accent shrink-0 group-hover:underline mt-0.5">
                      Turn {cat.turn_id} →
                    </span>
                  )}
                </button>
              )}

              {/* Actionable Suggestion */}
              {cat.suggestion && (
                <div className="p-3 rounded-lg bg-surface border border-border text-xs text-muted flex items-start gap-2">
                  <span className="text-accent font-semibold shrink-0 font-heading">Tip:</span>
                  <span className="text-ink/80 leading-relaxed font-body">{cat.suggestion}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================
          EMBEDDED TRANSCRIPT WITH HIGHLIGHTING
         ======================================================== */}
      <div className="surface-card p-5 sm:p-6 animate-fade-in-up space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-ink">
            Full Discussion Transcript
          </h2>
          <span className="text-xs font-mono text-muted">
            {transcript.length} turns recorded
          </span>
        </div>

        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {transcript.map((turn) => {
            const info = PARTICIPANT_INFO[turn.speaker] || { color: "#9A9CA5" };
            const displayName = turn.speaker === "Student" ? "You" : turn.speaker;
            const isHighlighted = highlightedTurnId === turn.id;

            return (
              <div
                key={turn.id}
                id={`turn-${turn.id}`}
                className={`transcript-line flex items-start gap-3 rounded-md p-2 transition-all scroll-mt-24 ${
                  isHighlighted ? "highlight-turn" : ""
                }`}
              >
                <span className="font-mono text-[11px] text-muted shrink-0 mt-0.5 select-none w-8">
                  {turn.id}
                </span>

                <span
                  className="font-heading font-semibold text-xs sm:text-sm shrink-0 whitespace-nowrap"
                  style={{ color: info.color }}
                >
                  {displayName}:
                </span>

                <span className="text-xs sm:text-sm text-ink leading-relaxed font-body">
                  {turn.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
