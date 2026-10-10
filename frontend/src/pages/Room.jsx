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

  // Keep refs in sync
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { holdingFloorRef.current = holdingFloor; }, [holdingFloor]);
  useEffect(() => { isStudentSpeakingRef.current = isStudentSpeaking; }, [isStudentSpeaking]);

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
    initVoices(panel, () => {});
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

    setTranscript((prev) => [...prev, newTurn]);

    // Schedule AI response after a respectful pause
    clearTimeout(patienceTimerRef.current);
    patienceTimerRef.current = setTimeout(() => {
      requestAITurn();
    }, Math.max(1200, patienceSec * 600));
  }, [patienceSec]);

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

    setTranscript((prev) => [...prev, newTurn]);

    clearTimeout(patienceTimerRef.current);
    patienceTimerRef.current = setTimeout(() => {
      requestAITurn();
    }, 1200);
  }, []);

  // Request next AI turn
  const requestAITurn = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (phaseRef.current === "ended") return;
    if (holdingFloorRef.current) return; // Don't interrupt student holding floor

    isProcessingRef.current = true;
    setThinking(true);
    setError(null);

    const myTurnId = getTurnId();

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
      api_key: apiKey || localStorage.getItem("gd_arena_gemini_key") || "",
    };

    try {
      const result = await fetchTurn(payload);

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

      setTranscript((prev) => [...prev, newTurn]);
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

  // STT initialization with robust debouncing
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
  }, [muted, language, patienceSec, speaking, handleInterruption, commitStudentSpeech]);

  // Initial Moderator Opening Call
  useEffect(() => {
    if (phase === "opening" && transcript.length === 0) {
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

  return (
    <div className="h-screen flex flex-col bg-arena-bg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-arena-surface border-b border-arena-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-arena-accent to-arena-accent-glow bg-clip-text text-transparent">
            GD Arena
          </h1>
          {apiKey ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-arena-success/20 text-arena-success border border-arena-success/30 font-medium">
              Gemini 2.0 Flash
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-arena-warning/20 text-arena-warning border border-arena-warning/30 font-medium">
              Practice Mode
            </span>
          )}
        </div>

        <p className="text-sm text-arena-text-muted max-w-md truncate text-center flex-1 mx-4 font-medium">
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
          isSpeaking={isStudentSpeaking || !!bufferedText || !!interimText}
          isStudent
        />
      </div>

      {/* Dynamic Status Notification Bar */}
      <div className="px-6 py-2 bg-arena-surface/80 border-b border-arena-border/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {isStudentSpeaking || bufferedText ? (
            <div className="flex items-center gap-2 text-arena-accent-glow font-semibold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-arena-accent inline-block animate-ping" />
              <span>You have the floor — listening...</span>
            </div>
          ) : speaking ? (
            <div className="flex items-center gap-2 text-arena-info font-medium">
              <span>🗣️ {speaking} is speaking</span>
            </div>
          ) : thinking ? (
            <div className="flex items-center gap-2 text-arena-accent font-medium">
              <span>🤔 AI participants formulating response...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-arena-success font-medium">
              <span>💬 Floor is open — share your point or hold floor below</span>
            </div>
          )}
        </div>

        {/* Floor Control Buttons */}
        <div className="flex items-center gap-2">
          {bufferedText && (
            <button
              onClick={handleSendBuffer}
              className="px-3 py-1 rounded-lg bg-arena-accent text-white text-xs font-semibold hover:bg-arena-accent/80 transition-all cursor-pointer shadow-sm animate-fade-in-up"
            >
              ✓ Done Speaking (Submit Turn)
            </button>
          )}

          <button
            onClick={toggleHoldFloor}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              holdingFloor
                ? "bg-arena-accent text-white border-arena-accent shadow-md shadow-arena-accent/30"
                : "bg-arena-surface-2 text-arena-text-muted border-arena-border hover:border-arena-accent"
            }`}
          >
            {holdingFloor ? "✋ Holding Floor (Click when Done)" : "✋ Hold Floor"}
          </button>
        </div>
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
          💡 You haven't spoken in a few minutes. Find an opening to build on recent points!
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 min-h-0 flex flex-col mx-6 my-3 glass-card overflow-hidden">
        <div className="px-4 py-2 border-b border-arena-border/50 flex items-center justify-between">
          <span className="text-sm font-medium text-arena-text-muted">Live Discussion Transcript</span>
          {thinking && (
            <div className="flex items-center gap-2 text-xs text-arena-accent">
              <div className="flex gap-1">
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
              Thinking...
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
      <div className="px-6 py-3 bg-arena-surface border-t border-arena-border">
        {/* Status row */}
        <div className="flex items-center gap-4 mb-3 text-xs text-arena-text-muted">
          <span className={micStatus === "ok" ? "text-arena-success" : "text-arena-danger"}>
            {micStatus === "ok" ? "🎤 Mic Active" : micStatus === "denied" ? "🚫 Mic Denied" : "⚠️ Mic Unsupported"}
          </span>
          <span className={online ? "text-arena-success" : "text-arena-danger"}>
            {online ? "🟢 Connected" : "🔴 Offline"}
          </span>
          <span className="text-arena-text-muted">
            Patience: {patienceSec}s
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Text input fallback */}
          <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={micStatus !== "ok" ? "Type your point here..." : "Type if mic is noisy or unavailable..."}
              className="flex-1 px-4 py-2.5 rounded-xl bg-arena-surface-2 border border-arena-border text-arena-text text-sm placeholder-arena-text-muted/50 focus:outline-none focus:border-arena-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-arena-accent text-white text-sm font-medium hover:bg-arena-accent/80 disabled:opacity-40 transition-colors cursor-pointer"
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
            {muted ? "Unmute Mic" : "Mute Mic"}
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
