import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Scale, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import ParticipantCard from "../components/ParticipantCard";
import TranscriptPanel from "../components/TranscriptPanel";
import Timer from "../components/Timer";
import { fetchTurn } from "../lib/api";
import { speak, cancelTTS, initVoices, startSTT, stopSTT, setOnSpeakingChange } from "../lib/speech";
import {
  getTurnId, bumpTurnId, isTurnStale, getPhase, shouldShowNudge,
  PARTICIPANT_INFO,
} from "../lib/controller";

/**
 * Room page – Live GD with AI participants.
 * Features:
 * - Natural conversational turn-taking with speech buffering
 * - Permanent moderator deduplication
 * - Manual floor control (Hold Floor / Speak Now)
 * - Chrome STT live captions + natural TTS voice assignments
 * - Full fallback support with Gemini 2.0 Flash integration
 */
export default function Room() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state;

  // Redirect if no config
  if (!config) {
    navigate("/");
    return null;
  }

  const { topic, panel, durationMin, language, format, patienceSec = 2.5, apiKey = "" } = config;
  const durationSec = durationMin * 60;

  // State
  const [transcript, setTranscript] = useState([]);
  const [phase, setPhase] = useState("opening");
  const [speaking, setSpeaking] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [micStatus, setMicStatus] = useState("ok"); // ok | denied | unsupported
  const [online, setOnline] = useState(navigator.onLine);
  const [interimText, setInterimText] = useState("");
  const [bufferedText, setBufferedText] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const [muted, setMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [moderatorHasOpened, setModeratorHasOpened] = useState(false);
  const [holdingFloor, setHoldingFloor] = useState(false);
  const [isStudentSpeaking, setIsStudentSpeaking] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const turnIdRef = useRef(0);
  const transcriptRef = useRef([]);
  const phaseRef = useRef("opening");
  const moderatorHasOpenedRef = useRef(false);
  const lastStudentSpeechRef = useRef(null);
  const patienceTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speechBufferRef = useRef("");
  const holdingFloorRef = useRef(false);
  const isStudentSpeakingRef = useRef(false);
  const sttRef = useRef(null);
  const isProcessingRef = useRef(false);
  const turnCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Keep primitive refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { holdingFloorRef.current = holdingFloor; }, [holdingFloor]);
  useEffect(() => { isStudentSpeakingRef.current = isStudentSpeaking; }, [isStudentSpeaking]);

  // Synchronous push helper: updates transcriptRef immediately so closures never see stale transcript
  const pushTurn = useCallback((newTurn) => {
    transcriptRef.current = [...transcriptRef.current, newTurn];
    setTranscript(transcriptRef.current);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => { setOnline(false); cancelTTS(); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Init natural voices
  useEffect(() => {
    initVoices(panel, () => { });
    setOnSpeakingChange((name) => setSpeaking(name));
  }, [panel]);

  // Handle interruption
  const handleInterruption = useCallback(() => {
    cancelTTS();
    const newId = bumpTurnId();
    turnIdRef.current = newId;
    clearTimeout(patienceTimerRef.current);
    isProcessingRef.current = false;
    setSpeaking(null);
    setThinking(false);
  }, []);

  // Commit accumulated student speech to transcript
  const commitStudentSpeech = useCallback(() => {
    const fullText = speechBufferRef.current.trim();
    if (!fullText) return;

    speechBufferRef.current = "";
    setBufferedText("");
    setInterimText("");
    setIsStudentSpeaking(false);
    clearTimeout(silenceTimerRef.current);

    const now = (Date.now() - startTimeRef.current) / 1000;
    lastStudentSpeechRef.current = now;
    setNudgeVisible(false);

    const turnId = `t${++turnCountRef.current}`;
    const newTurn = {
      id: turnId,
      speaker: "Student",
      text: fullText,
      started_at: Math.max(0, now - (fullText.split(" ").length * 0.35)),
      ended_at: now,
    };

    // Step 2: Push student's final utterance synchronously into transcriptRef BEFORE calling /turn
    pushTurn(newTurn);

    // Schedule AI response after a respectful pause
    clearTimeout(patienceTimerRef.current);
    patienceTimerRef.current = setTimeout(() => {
      requestAITurn();
    }, Math.max(1200, patienceSec * 600));
  }, [patienceSec, pushTurn]);

  // Add student turn directly (e.g. from text fallback)
  const addStudentTurn = useCallback((text) => {
    speechBufferRef.current = "";
    setBufferedText("");
    setInterimText("");
    setIsStudentSpeaking(false);
    clearTimeout(silenceTimerRef.current);

    const now = (Date.now() - startTimeRef.current) / 1000;
    lastStudentSpeechRef.current = now;
    setNudgeVisible(false);

    const turnId = `t${++turnCountRef.current}`;
    const newTurn = {
      id: turnId,
      speaker: "Student",
      text,
      started_at: Math.max(0, now - (text.split(" ").length * 0.35)),
      ended_at: now,
    };

    // Step 2: Push student utterance synchronously into transcriptRef BEFORE calling /turn
    pushTurn(newTurn);

    clearTimeout(patienceTimerRef.current);
    patienceTimerRef.current = setTimeout(() => {
      requestAITurn();
    }, 1200);
  }, [pushTurn]);

  // Request next AI turn
  const requestAITurn = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (phaseRef.current === "ended") return;
    if (holdingFloorRef.current) return; // Don't interrupt student holding floor

    isProcessingRef.current = true;
    setThinking(true);
    setError(null);

    const myTurnId = getTurnId();

    // Step 2: Build payload from transcriptRef. Set last_speaker to real speaker of last turn
    const lastTurn = transcriptRef.current.length > 0
      ? transcriptRef.current[transcriptRef.current.length - 1]
      : null;
    const lastSpeaker = lastTurn ? lastTurn.speaker : "Moderator";

    const payload = {
      topic,
      format,
      language,
      panel,
      phase: phaseRef.current,
      last_speaker: lastSpeaker,
      // Step 2: Send the last 8 turns as {id, speaker, text}
      transcript: transcriptRef.current.slice(-8).map((t) => ({
        id: t.id,
        speaker: t.speaker,
        text: t.text,
      })),
      api_key: apiKey || localStorage.getItem("gd_arena_gemini_key") || "",
    };

    try {
      const result = await fetchTurn(payload);

      // Step 1: Console.log response source and fallback reason if applicable
      console.log("[GD Arena /turn reply]", {
        speaker: result.speaker,
        source: result.source,
        fallback_reason: result.fallback_reason,
        text: result.text,
      });
      if (result.source === "fallback") {
        console.warn(`[GD Arena /turn FALLBACK] Speaker: ${result.speaker}, Reason: ${result.fallback_reason || 'unknown'}`);
      }

      // Check if turn was cancelled while in flight
      if (isTurnStale(myTurnId)) {
        setThinking(false);
        isProcessingRef.current = false;
        return;
      }

      const now = (Date.now() - startTimeRef.current) / 1000;
      const turnId = `t${++turnCountRef.current}`;
      const newTurn = {
        id: turnId,
        speaker: result.speaker,
        text: result.text,
        started_at: now,
        ended_at: now + (result.text.split(" ").length * 0.35),
      };

      // Step 2: Push synchronously into transcriptRef and state
      pushTurn(newTurn);
      setThinking(false);

      // Mark moderator opening complete permanent
      if (result.speaker === "Moderator") {
        moderatorHasOpenedRef.current = true;
        setModeratorHasOpened(true);
        if (phaseRef.current === "opening") {
          phaseRef.current = "middle";
          setPhase("middle");
        }
      }

      // Speak aloud via TTS
      await speak(result.speaker, result.text, null, null);

      isProcessingRef.current = false;

      // Generous conversational pause before next AI turn (allows student to speak naturally)
      if (!isTurnStale(myTurnId) && phaseRef.current !== "ended") {
        clearTimeout(patienceTimerRef.current);
        patienceTimerRef.current = setTimeout(() => {
          if (
            phaseRef.current !== "ended" &&
            !holdingFloorRef.current &&
            !speechBufferRef.current.trim() &&
            !isStudentSpeakingRef.current
          ) {
            requestAITurn();
          }
        }, Math.max(5000, patienceSec * 1000 + 2000));
      }
    } catch (err) {
      console.error("Turn error:", err);
      setError("AI response failed. Retrying...");
      setThinking(false);
      isProcessingRef.current = false;

      setTimeout(() => {
        if (!isTurnStale(myTurnId) && phaseRef.current !== "ended") {
          requestAITurn();
        }
      }, 2500);
    }
  }, [topic, format, language, panel, patienceSec, apiKey]);

  const [sttLang, setSttLang] = useState(language === "hinglish" ? "en-IN" : "en-US");

  // STT initialization with robust debouncing
  useEffect(() => {
    if (muted) {
      stopSTT();
      return;
    }

    const stt = startSTT({
      lang: sttLang,
      onInterim: (text) => {
        setInterimText(text);
        setIsStudentSpeaking(true);

        // Interrupt active AI if student starts speaking
        if (speaking && text.trim().length > 3) {
          handleInterruption();
        }

        // Student is speaking -> pause AI auto timers
        clearTimeout(patienceTimerRef.current);
        clearTimeout(silenceTimerRef.current);
      },
      onFinal: (text) => {
        const clean = text.trim();
        if (clean) {
          // Accumulate chunk into speech buffer
          const updated = (speechBufferRef.current ? speechBufferRef.current + " " + clean : clean).trim();
          speechBufferRef.current = updated;
          setBufferedText(updated);
          setInterimText("");
          setIsStudentSpeaking(true);

          // Clear any AI speech
          clearTimeout(patienceTimerRef.current);

          // If not manually holding floor, wait for natural silence before committing turn
          if (!holdingFloorRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              commitStudentSpeech();
            }, Math.max(2500, patienceSec * 1000));
          }
        }
      },
      onError: (err) => {
        if (err === "denied") setMicStatus("denied");
        else if (err === "unsupported") setMicStatus("unsupported");
        else setError(`Mic error: ${err}`);
      },
    });

    sttRef.current = stt;
    if (!stt.isSupported) setMicStatus("unsupported");

    return () => {
      stt.stop();
      clearTimeout(silenceTimerRef.current);
      clearTimeout(patienceTimerRef.current);
    };
  }, [muted, sttLang, patienceSec, speaking, handleInterruption, commitStudentSpeech]);

  // Initial Moderator Opening Call
  useEffect(() => {
    if (phaseRef.current === "opening" && transcriptRef.current.length === 0) {
      requestAITurn();
    }
  }, []);

  // Timer Tick
  const handleTimerTick = useCallback((elapsed, remaining) => {
    setElapsedSec(elapsed);
    if (!moderatorHasOpenedRef.current) return;

    const newPhase = getPhase(elapsed, durationSec, true);
    if (newPhase !== phaseRef.current) {
      phaseRef.current = newPhase;
      setPhase(newPhase);
      if (newPhase === "closing") {
        setTimeout(() => requestAITurn(), 600);
      }
    }

    if (shouldShowNudge(lastStudentSpeechRef.current, elapsed, phaseRef.current)) {
      setNudgeVisible(true);
    }
  }, [durationSec, requestAITurn]);

  const handleTimerEnd = useCallback(() => {
    setPhase("ended");
    cancelTTS();
    stopSTT();
    navigate("/report", {
      state: { topic, transcript: transcriptRef.current, apiKey },
    });
  }, [topic, navigate, apiKey]);

  // Floor toggling
  const toggleHoldFloor = () => {
    handleInterruption();
    const nextState = !holdingFloor;
    setHoldingFloor(nextState);
    holdingFloorRef.current = nextState;

    if (!nextState && speechBufferRef.current.trim()) {
      commitStudentSpeech();
    }
  };

  // Submit speech buffer immediately
  const handleSendBuffer = () => {
    commitStudentSpeech();
  };

  // Text input fallback
  const handleTextSubmit = useCallback((e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleInterruption();
    addStudentTurn(textInput.trim());
    setTextInput("");
  }, [textInput, addStudentTurn, handleInterruption]);

  const handleEndGD = useCallback(() => {
    cancelTTS();
    stopSTT();
    setPhase("ended");
    navigate("/report", {
      state: { topic, transcript: transcriptRef.current, apiKey },
    });
  }, [topic, navigate, apiKey]);

  // Smart Participation Balancer Metrics
  const balanceMetrics = useMemo(() => {
    const totalParticipants = panel.length + 1; // panel + Student
    const idealSharePct = Math.round(100 / totalParticipants);

    const participantStats = {};
    [...panel, "Student"].forEach((name) => {
      participantStats[name] = { turns: 0, words: 0, name };
    });

    let totalWords = 0;
    transcript.forEach((t) => {
      if (t.speaker && t.speaker !== "Moderator" && participantStats[t.speaker]) {
        const words = (t.text || "").trim().split(/\s+/).filter(Boolean).length;
        participantStats[t.speaker].turns += 1;
        participantStats[t.speaker].words += words;
        totalWords += words;
      }
    });

    const participantShares = Object.values(participantStats).map((p) => {
      const share = totalWords > 0 ? Math.round((p.words / totalWords) * 100) : idealSharePct;
      return {
        ...p,
        share,
        color: PARTICIPANT_INFO[p.name]?.color || "#C8F545",
        isDominant: share >= 38 && p.turns >= 2,
        isQuiet: share < Math.round(idealSharePct * 0.55) || p.turns <= 1,
      };
    });

    const dominantSpeaker = participantShares.find((p) => p.isDominant);
    const studentStat = participantShares.find((p) => p.name === "Student") || { turns: 0, share: 0 };

    let avgDeviation = 0;
    participantShares.forEach((p) => {
      avgDeviation += Math.abs(p.share - idealSharePct);
    });
    avgDeviation = participantShares.length > 0 ? avgDeviation / participantShares.length : 0;
    const fairOpportunityIndex = Math.max(40, Math.min(100, Math.round(100 - avgDeviation * 1.5)));

    const suggestedPrompt = studentStat.turns === 0
      ? "What is your perspective on this, Student? State your core point!"
      : dominantSpeaker
      ? `What is your perspective on ${dominantSpeaker.name}'s point? Build or counter!`
      : "What is your perspective on how this impacts individuals and organizations?";

    return {
      participantShares,
      dominantSpeaker,
      studentStat,
      fairOpportunityIndex,
      suggestedPrompt,
      idealSharePct,
    };
  }, [transcript, panel]);

  return (
    <div className="h-screen flex flex-col bg-bg text-ink font-body">
      {/* Header bar with centered JetBrains Mono timer */}
      <div className="relative flex items-center justify-between px-6 py-3 bg-surface border-b border-border min-h-[56px]">
        {/* Left: App Title and Topic */}
        <div className="flex items-center gap-3 max-w-[35%] truncate">
          <span className="font-heading font-bold text-ink text-base tracking-tight shrink-0">
            GD Arena
          </span>
          <span className="text-border">|</span>
          <p className="text-xs text-muted truncate font-medium">
            {topic}
          </p>
        </div>

        {/* Center: Timer in JetBrains Mono */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <Timer
            durationSec={durationSec}
            phase={phase}
            onTick={handleTimerTick}
            onEnd={handleTimerEnd}
          />
        </div>

        {/* Right: End Session action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndGD}
            className="px-3.5 py-1.5 rounded-lg bg-raised text-danger border border-danger/30 hover:bg-danger/15 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
          >
            End Discussion
          </button>
        </div>
      </div>

      {/* Participant cards row */}
      <div className="flex gap-3 px-6 py-3 overflow-x-auto justify-center bg-bg border-b border-border">
        <ParticipantCard
          name="Moderator"
          isSpeaking={speaking === "Moderator"}
          isThinking={thinking && !speaking}
        />
        {panel.map((name) => (
          <ParticipantCard
            key={name}
            name={name}
            isSpeaking={speaking === name}
            isThinking={thinking && !speaking}
          />
        ))}
        <ParticipantCard
          name="Student"
          isSpeaking={isStudentSpeaking || !!bufferedText || !!interimText}
          isStudent
        />
      </div>

      {/* Dynamic Status Notification Bar */}
      <div className="px-6 py-2 bg-surface border-b border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {isStudentSpeaking || bufferedText ? (
            <div className="flex items-center gap-2 text-accent font-medium">
              <span className="w-2 h-2 rounded-full bg-accent inline-block animate-ping" />
              <span>You have the floor — listening...</span>
            </div>
          ) : speaking ? (
            <div className="flex items-center gap-2 text-ink font-medium">
              <span className="text-muted">Speaking:</span>
              <span className="font-semibold">{speaking}</span>
            </div>
          ) : thinking ? (
            <div className="flex items-center gap-2 text-muted font-medium">
              <div className="flex gap-1 items-center">
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
              <span>AI formulating next turn...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-success font-medium">
              <span>● Floor is open — speak naturally or click Hold Floor below</span>
            </div>
          )}
        </div>

        {/* Floor Control Buttons */}
        <div className="flex items-center gap-2">
          {bufferedText && (
            <button
              onClick={handleSendBuffer}
              className="px-3 py-1.5 rounded-lg bg-accent text-[#0E0F12] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer min-h-[36px] shadow-sm animate-fade-in-up"
            >
              ✓ Done Speaking (Submit Turn)
            </button>
          )}

          <button
            onClick={toggleHoldFloor}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer min-h-[36px] ${holdingFloor
                ? "bg-accent text-[#0E0F12] border-accent font-semibold"
                : "bg-surface text-muted border-border hover:bg-raised hover:text-ink"
              }`}
          >
            {holdingFloor ? "✋ Holding Floor (Click when Done)" : "✋ Hold Floor"}
          </button>
        </div>
      </div>

      {/* ========================================================
          SMART PARTICIPATION BALANCER (FAIR MODERATOR ENGINE)
         ======================================================== */}
      <div className="mx-6 mt-2.5 p-3 rounded-lg bg-surface border border-border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Balancer Status & Fair Opportunity Index */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-raised border border-accent/40 flex items-center justify-center text-accent shrink-0 shadow-sm">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-heading font-bold text-ink tracking-tight">
                  Smart Participation Balancer
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-raised border border-accent/30 text-accent font-semibold">
                  Fair Opportunity: {balanceMetrics.fairOpportunityIndex}%
                </span>
                {balanceMetrics.dominantSpeaker ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-danger/15 border border-danger/30 text-danger font-semibold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Dominance Warning: {balanceMetrics.dominantSpeaker.name} ({balanceMetrics.dominantSpeaker.share}%)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Balanced Floor
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted font-body mt-0.5">
                AI acts as a fair moderator, not just a judge — encouraging quieter students to contribute without interrupting confident speakers.
              </p>
            </div>
          </div>

          {/* Right: Suggested Prompt from Fair Moderator */}
          <div className="flex items-center gap-2 bg-raised border border-border px-3 py-1.5 rounded-lg max-w-md w-full sm:w-auto">
            <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono text-muted uppercase block leading-none">
                Suggested Prompt for Quieter Speaker:
              </span>
              <p className="text-xs text-ink truncate font-medium mt-0.5">
                "{balanceMetrics.suggestedPrompt}"
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTextInput(balanceMetrics.suggestedPrompt)}
              className="text-[10px] font-mono px-2 py-1 rounded bg-accent text-[#0E0F12] font-semibold hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
              title="Insert prompt into input box"
            >
              Use
            </button>
          </div>
        </div>

        {/* Live Participation Share Mini Bars */}
        <div className="mt-2.5 pt-2 border-t border-border flex items-center gap-4 text-xs">
          <span className="text-[10px] font-mono text-muted uppercase tracking-wider shrink-0">
            Participation Share:
          </span>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto py-0.5">
            {balanceMetrics.participantShares.map((p) => {
              const isStudent = p.name === "Student";
              return (
                <div
                  key={p.name}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-raised border text-[11px] font-mono shrink-0"
                  style={{
                    borderColor: p.isDominant ? "#F87171" : p.isQuiet && isStudent ? "#C8F545" : "#2A2E37",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-ink font-semibold">
                    {isStudent ? "You" : p.name}:
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: p.isDominant ? "#F87171" : p.color }}
                  >
                    {p.share}%
                  </span>
                  <span className="text-muted text-[10px]">
                    ({p.turns} {p.turns === 1 ? "turn" : "turns"})
                  </span>
                  {p.isDominant && (
                    <span className="text-[9px] px-1 rounded bg-danger/20 text-danger font-semibold">
                      High
                    </span>
                  )}
                  {p.isQuiet && (
                    <span className="text-[9px] px-1 rounded bg-raised text-muted font-semibold">
                      Quiet
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-[10px] font-mono text-muted shrink-0 hidden sm:block">
            Target: ~{balanceMetrics.idealSharePct}% / speaker
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-2 p-3 rounded-card bg-surface border border-l-4 border-l-danger border-border text-xs text-danger animate-fade-in-up">
          {error}
        </div>
      )}

      {/* Offline banner */}
      {!online && (
        <div className="mx-6 mt-2 p-3 rounded-card bg-surface border border-l-4 border-l-warn border-border text-xs text-warn animate-fade-in-up">
          ⚠️ Network offline. AI responses are paused until connection restores.
        </div>
      )}

      {/* Nudge */}
      {nudgeVisible && (
        <div className="mx-6 mt-2 p-3 rounded-card bg-surface border border-l-4 border-l-accent border-border text-xs text-ink animate-fade-in-up">
          💡 You haven't spoken in over 3 minutes. Find an opening to build on recent points!
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 min-h-0 flex flex-col mx-6 my-3 surface-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-surface">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-muted">
            Live Discussion Transcript
          </span>
          {thinking && (
            <div className="flex items-center gap-2 text-xs font-mono text-accent">
              <div className="flex gap-1">
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
              thinking...
            </div>
          )}
        </div>
        <TranscriptPanel
          transcript={transcript}
          interimText={interimText}
          bufferedText={bufferedText}
          showCaptions={showCaptions}
        />
      </div>

      {/* Bottom controls */}
      <div className="px-6 py-3 bg-surface border-t border-border">
        {/* Status indicator row */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-2.5 text-xs text-muted font-mono">
          <span className={micStatus === "ok" ? "text-success" : "text-danger"}>
            {micStatus === "ok" ? "● Mic Ready" : micStatus === "denied" ? "✕ Mic Blocked" : "▲ Mic Unsupported"}
          </span>
          <span className={online ? "text-success" : "text-danger"}>
            {online ? "● Connected" : "✕ Offline"}
          </span>
          {language === "hinglish" && (
            <button
              type="button"
              onClick={() => setSttLang(sttLang === "en-IN" ? "hi-IN" : "en-IN")}
              className="text-[11px] px-2 py-0.5 rounded bg-raised border border-border hover:border-accent text-ink cursor-pointer transition-colors"
              title="Click to toggle between Indian English/Hinglish (Latin script) and pure Hindi (Devanagari)"
            >
              Mic: {sttLang === "en-IN" ? "Hinglish (en-IN)" : "Hindi (hi-IN)"} ⇄
            </button>
          )}
          <span>
            Patience: {patienceSec}s
          </span>
        </div>

        {/* Action Controls row */}
        <div className="flex items-center gap-3">
          {/* Text input fallback */}
          <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={micStatus !== "ok" ? "Type your point here..." : "Type if mic is unavailable or noisy..."}
              className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-ink text-sm placeholder-muted/60 focus:outline-none focus:border-accent focus:bg-raised transition-colors min-h-[40px]"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-4 py-2.5 rounded-lg bg-accent text-[#0E0F12] text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer min-h-[40px]"
            >
              Send
            </button>
          </form>

          {/* Mic Button: accent when listening, with a pulse ring */}
          <button
            onClick={() => setMuted(!muted)}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[40px] flex items-center gap-2 ${!muted && micStatus === "ok"
                ? "bg-accent text-[#0E0F12] font-semibold ring-2 ring-accent/60 ring-offset-2 ring-offset-bg shadow-sm"
                : muted
                  ? "bg-raised text-muted border border-border hover:text-ink"
                  : "bg-surface text-danger border border-danger/40"
              }`}
          >
            {!muted && micStatus === "ok" && (
              <span className="w-2 h-2 rounded-full bg-[#0E0F12] inline-block animate-ping" />
            )}
            {muted ? "Unmute Mic" : "Mic Active"}
          </button>

          {/* Captions Toggle */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[40px] border ${showCaptions
                ? "bg-raised text-ink border-accent/40"
                : "bg-surface text-muted border-border hover:bg-raised hover:text-ink"
              }`}
          >
            Captions
          </button>

          {/* End GD Button */}
          <button
            onClick={handleEndGD}
            className="px-4 py-2.5 rounded-lg bg-raised text-danger border border-danger/30 text-xs sm:text-sm font-medium hover:bg-danger/15 transition-colors cursor-pointer min-h-[40px]"
          >
            End GD
          </button>
        </div>
      </div>
    </div>
  );
}
