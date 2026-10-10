import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
 * Manages transcript, phases, TTS/STT, interruption, and text fallback.
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

  const { topic, panel, durationMin, language, format, patienceSec } = config;
  const durationSec = durationMin * 60;

  // State
  const [transcript, setTranscript] = useState([]);
  const [phase, setPhase] = useState("opening");
  const [speaking, setSpeaking] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [micStatus, setMicStatus] = useState("ok"); // ok | denied | unsupported
  const [online, setOnline] = useState(navigator.onLine);
  const [interimText, setInterimText] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const [muted, setMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [moderatorHasOpened, setModeratorHasOpened] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const turnIdRef = useRef(0);
  const transcriptRef = useRef([]);
  const phaseRef = useRef("opening");
  const lastStudentSpeechRef = useRef(null);
  const patienceTimerRef = useRef(null);
  const sttRef = useRef(null);
  const isProcessingRef = useRef(false);
  const turnCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Keep refs in sync
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

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

  // Init voices
  useEffect(() => {
    initVoices(panel, () => {});
    setOnSpeakingChange((name) => setSpeaking(name));
  }, []);

  // Start STT
  useEffect(() => {
    if (muted) {
      stopSTT();
      return;
    }

    const lang = language === "hinglish" ? "hi-IN" : "en-US";
    const stt = startSTT({
      lang,
      onInterim: (text) => {
        setInterimText(text);
        // If student speaks while AI is speaking → interrupt
        if (speaking && text.length > 5) {
          handleInterruption();
        }
      },
      onFinal: (text) => {
        setInterimText("");
        if (text.trim()) {
          addStudentTurn(text.trim());
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

    return () => stt.stop();
  }, [muted, language]);

  // Kick off the opening moderator turn
  useEffect(() => {
    if (phase === "opening" && transcript.length === 0) {
      requestAITurn();
    }
  }, []);

  // Handle phase transitions from timer
  const handleTimerTick = useCallback((elapsed, remaining) => {
    setElapsedSec(elapsed);
    const newPhase = getPhase(elapsed, durationSec, moderatorHasOpened);
    if (newPhase !== phaseRef.current) {
      setPhase(newPhase);
      if (newPhase === "closing") {
        // Request closing moderator turn
        setTimeout(() => requestAITurn(), 500);
      }
    }

    // Nudge check
    if (shouldShowNudge(lastStudentSpeechRef.current, elapsed, newPhase)) {
      setNudgeVisible(true);
    }
  }, [durationSec, moderatorHasOpened]);

  const handleTimerEnd = useCallback(() => {
    setPhase("ended");
    cancelTTS();
    stopSTT();
    // Navigate to report
    setTimeout(() => {
      navigate("/report", {
        state: { topic, transcript: transcriptRef.current },
      });
    }, 1500);
  }, [topic, navigate]);

  // ---------- Turn management ----------

  const addStudentTurn = useCallback((text) => {
    const now = (Date.now() - startTimeRef.current) / 1000;
    lastStudentSpeechRef.current = now;
    setNudgeVisible(false);

    const turnId = `t${++turnCountRef.current}`;
    const newTurn = {
      id: turnId,
      speaker: "Student",
      text,
      started_at: now - (text.split(" ").length * 0.3), // estimate
      ended_at: now,
    };

    setTranscript((prev) => [...prev, newTurn]);

    // Schedule AI response after patience delay
    clearTimeout(patienceTimerRef.current);
    patienceTimerRef.current = setTimeout(() => {
      requestAITurn();
    }, patienceSec * 1000);
  }, [patienceSec]);

  const handleInterruption = useCallback(() => {
    cancelTTS();
    const newId = bumpTurnId();
    turnIdRef.current = newId;
    clearTimeout(patienceTimerRef.current);
    setSpeaking(null);
  }, []);

  const requestAITurn = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (phaseRef.current === "ended") return;

    isProcessingRef.current = true;
    setThinking(true);
    setError(null);

    const myTurnId = getTurnId();

    // Build request
    const lastSpeaker = transcriptRef.current.length > 0
      ? transcriptRef.current[transcriptRef.current.length - 1].speaker
      : "Moderator";

    const payload = {
      topic,
      format,
      language,
      panel,
      phase: phaseRef.current,
      last_speaker: lastSpeaker,
      transcript: transcriptRef.current.slice(-6).map((t) => ({
        id: t.id,
        speaker: t.speaker,
        text: t.text,
      })),
    };

    try {
      const result = await fetchTurn(payload);

      // Check if turn is still current
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
        ended_at: now + (result.text.split(" ").length * 0.3),
      };

      setTranscript((prev) => [...prev, newTurn]);
      setThinking(false);

      // Track if moderator has opened
      if (phaseRef.current === "opening" && result.speaker === "Moderator") {
        setModeratorHasOpened(true);
        setPhase("middle");
      }

      // Speak the line (TTS)
      await speak(result.speaker, result.text, null, null);

      isProcessingRef.current = false;

      // If still current and student hasn't spoken, continue the discussion
      if (!isTurnStale(myTurnId) && phaseRef.current !== "ended") {
        // Auto-continue: AI talks to each other
        clearTimeout(patienceTimerRef.current);
        patienceTimerRef.current = setTimeout(() => {
          if (phaseRef.current !== "ended") {
            requestAITurn();
          }
        }, patienceSec * 1000 + 500);
      }
    } catch (err) {
      console.error("Turn error:", err);
      setError("AI response failed. Retrying...");
      setThinking(false);
      isProcessingRef.current = false;

      // Retry once after 2s
      setTimeout(() => {
        if (!isTurnStale(myTurnId)) {
          requestAITurn();
        }
      }, 2000);
    }
  }, [topic, format, language, panel, patienceSec]);

  // ---------- Text input fallback ----------

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
      state: { topic, transcript: transcriptRef.current },
    });
  }, [topic, navigate]);

  // ---------- Render ----------

  return (
    <div className="h-screen flex flex-col bg-arena-bg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-arena-surface border-b border-arena-border">
        <h1 className="text-lg font-bold bg-gradient-to-r from-arena-accent to-arena-accent-glow bg-clip-text text-transparent">
          GD Arena
        </h1>
        <p className="text-sm text-arena-text-muted max-w-md truncate text-center flex-1 mx-4">
          {topic}
        </p>
        <Timer
          durationSec={durationSec}
          phase={phase}
          onTick={handleTimerTick}
          onEnd={handleTimerEnd}
        />
      </div>

      {/* Participant cards */}
      <div className="flex gap-3 px-6 py-4 overflow-x-auto justify-center bg-arena-bg/50 border-b border-arena-border/50">
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
          isSpeaking={!!interimText}
          isStudent
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-2 p-3 rounded-xl bg-arena-danger/10 border border-arena-danger/30 text-sm text-arena-danger animate-fade-in-up">
          {error}
        </div>
      )}

      {/* Offline banner */}
      {!online && (
        <div className="mx-6 mt-2 p-3 rounded-xl bg-arena-warning/10 border border-arena-warning/30 text-sm text-arena-warning animate-fade-in-up">
          ⚠️ You are offline. AI responses paused.
        </div>
      )}

      {/* Nudge */}
      {nudgeVisible && (
        <div className="mx-6 mt-2 p-3 rounded-xl bg-arena-info/10 border border-arena-info/30 text-sm text-arena-info animate-fade-in-up">
          💡 You haven't spoken for 3 minutes. Look for an opening to share your thoughts!
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 min-h-0 flex flex-col mx-6 my-3 glass-card overflow-hidden">
        <div className="px-4 py-2 border-b border-arena-border/50 flex items-center justify-between">
          <span className="text-sm font-medium text-arena-text-muted">Transcript</span>
          {thinking && (
            <div className="flex items-center gap-2 text-xs text-arena-accent">
              <div className="flex gap-1">
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
              AI thinking...
            </div>
          )}
        </div>
        <TranscriptPanel
          transcript={transcript}
          interimText={interimText}
          showCaptions={showCaptions}
        />
      </div>

      {/* Bottom controls */}
      <div className="px-6 py-3 bg-arena-surface border-t border-arena-border">
        {/* Status row */}
        <div className="flex items-center gap-4 mb-3 text-xs text-arena-text-muted">
          <span className={micStatus === "ok" ? "text-arena-success" : "text-arena-danger"}>
            {micStatus === "ok" ? "🎤 Mic ok" : micStatus === "denied" ? "🚫 Mic denied" : "⚠️ Mic unsupported"}
          </span>
          <span className={online ? "text-arena-success" : "text-arena-danger"}>
            {online ? "🟢 Connected" : "🔴 Offline"}
          </span>
          <span className="text-arena-text-muted">
            {speaking ? `🗣️ ${speaking} speaking` : thinking ? "🤔 AI thinking" : "💤 AI idle"}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Text input (always present as fallback) */}
          <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={micStatus !== "ok" ? "Type to participate..." : "Type if mic fails..."}
              className="flex-1 px-4 py-2.5 rounded-xl bg-arena-surface-2 border border-arena-border text-arena-text text-sm placeholder-arena-text-muted/50 focus:outline-none focus:border-arena-accent transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-arena-accent text-white text-sm font-medium hover:bg-arena-accent/80 transition-colors cursor-pointer"
            >
              Send
            </button>
          </form>

          {/* Action buttons */}
          <button
            onClick={() => setMuted(!muted)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              muted
                ? "bg-arena-danger/20 text-arena-danger border border-arena-danger/30"
                : "bg-arena-surface-2 text-arena-text-muted border border-arena-border hover:border-arena-accent"
            }`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>

          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              showCaptions
                ? "bg-arena-info/20 text-arena-info border border-arena-info/30"
                : "bg-arena-surface-2 text-arena-text-muted border border-arena-border"
            }`}
          >
            Captions
          </button>

          <button
            onClick={handleEndGD}
            className="px-4 py-2.5 rounded-xl bg-arena-danger/20 text-arena-danger border border-arena-danger/30 text-sm font-medium hover:bg-arena-danger/30 transition-colors cursor-pointer"
          >
            End GD
          </button>
        </div>
      </div>
    </div>
  );
}
