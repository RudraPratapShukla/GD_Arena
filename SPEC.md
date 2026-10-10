# GD ARENA: SPEC.md

Paste or attach this file at the start of every AI coding session.
Build only what is in this file. One feature per prompt. Run and `git commit` after each step.

---

## 1. What we're building

Hackathon: Azisly.ai, Problem Statement 2, "GD Arena".
A voice-first web app where a student joins a live group discussion (GD) with AI participants and gets honest, evidence-backed feedback afterwards.

**Deadline: working prototype in 4 hours.**

### Core requirements (from the problem statement)
1. **Room setup:** topic list + custom topic, panel of 3-5 AI participants + a moderator.
2. **Live spoken discussion:** the student speaks and the app transcribes live; AI participants answer aloud with their own voice and personality (dominator, data-driven, quiet one, one who drifts off topic).
3. **Natural turn-taking:** AIs wait for pauses, never all talk at once, STOP when the student interrupts, and respond to each other (not only to the student).
4. **Structure:** moderator opens, a timer runs, a closing round ends the GD.
5. **Report afterwards:** who spoke how much; feedback on starting, idea quality, building on others, listening, handling interruptions, ending strongly. **Every feedback point must link to a quoted moment in the transcript.**

### Also expected
- Clearly different personalities and voices per participant.
- Replies fast enough to feel like a conversation.
- Graceful handling of: denied microphone, lost connection, failed AI call (never break the room).
- Tell the student clearly that the other participants are AI.

### Optional "make it yours" (only after core works)
Formats (case / abstract / controversial / fishbowl), Hinglish room, silent nudges ("you haven't spoken for 3 minutes"), "what you could have said", friends joining, progress over time, accessibility (live captions, adjustable patience before the AI speaks).

---

## 2. Scope for the 4-hour prototype

**IN**
- Everything in the core list
- AI notice on the setup and room screens
- Error handling (mic denied, offline, LLM fail)
- Live captions
- Patience slider (accessibility)
- Moderator phases: opening, middle, closing

**CHEAP BONUSES** (5-10 min each, only after core works)
- Hinglish toggle
- Silent nudge after 3 minutes without the student speaking
- GD format prompt injection (general / case / abstract / controversial)

**OUT**
Database, auth, WebSocket, deployment, progress dashboard, friends joining, fishbowl, "what you could have said" (add only if 15+ minutes remain at 3:30).

Run locally on Chrome. Record a backup demo video.

---

## 3. Tech stack (and why)

| Layer | Pick | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind | Fast setup, AI agents generate it reliably |
| Backend | FastAPI | Stateless, 2 endpoints, Python is good for metrics and validation |
| Speech-to-text | Browser `webkitSpeechRecognition` (Chrome only) | Zero setup, free live interim captions |
| Text-to-speech | Browser `speechSynthesis` | Distinct voices, `cancel()` gives instant interruption |
| AI participants | LLM API with JSON output | One call returns speaker + line |
| State | Frontend memory | No DB, no WebSocket, fewer bugs |
| Deploy | Skip (local + screen recording) | Deploy can eat 30-60 minutes |

LLM split:
- `/turn`: fast, cheap model. Latency target 1-2 s.
- `/report`: stronger model. Quality over speed.

Rejected: LangChain, Whisper/ElevenLabs, Next.js, Supabase, deployment.
Secrets: API key only in `backend/.env`. Never in frontend code. `.env` is gitignored.

---

## 4. System architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ BROWSER  (React + Vite + Tailwind)                           │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ UI screens │ │ Mic (STT)  │ │ Voice (TTS)│ │ Controller │ │
│  │ 3 screens  │ │ Live       │ │ Queue,     │ │ Timer,     │ │
│  │            │ │ captions   │ │ cancel()   │ │ turn ID    │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
└───────────────────────────┬──────────────────────────────────┘
                            │  REST (JSON)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ BACKEND  (FastAPI, stateless)                                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ POST /turn   │  │ POST /report │  │ Personas + guards  │  │
│  │ speaker +    │  │ metrics +    │  │ prompts, quote     │  │
│  │ next line    │  │ evaluation   │  │ check              │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ LLM API           │
                  │ fast + strong     │
                  └───────────────────┘
```

Architecture rules:
- **One discussion controller. NOT five independent agents.**
- **One LLM call per turn** picks the speaker AND writes the line.
- Personality prompts decide WHAT is said. Code decides WHEN and WHO speaks.
- The frontend owns state. The backend is stateless.

---

## 5. Pages architecture (demo screens)

Three screens: **Setup → Room → Report.**

### 5.1 Screen 1: Setup (`pages/Setup.jsx`)

Purpose: set up the room.

Layout, top to bottom:
```text
┌──────────────────────────────────────────────────────────┐
│ GD Arena                       Step 1 of 2: set up room  │
├──────────────────────────────────────────────────────────┤
│ [!] All other participants and the moderator are AI,     │
│     not real students.                                   │
│                                                          │
│ Topic                                                    │
│ (Should AI replace human jobs?) (Social media: harm or   │
│  good?) (The colour of success) (Case: training vs       │
│  automation)                                             │
│ [ Or type your own topic ...................... ]        │
│                                                          │
│ AI participants   Duration        Language               │
│ (3) (4) (5)       (3 min) (5 min) (English) (Hinglish)   │
│                                                          │
│ Your panel                                               │
│ Aarav (dominator)  Meera (data-driven)  Kabir (quiet)    │
│                                                          │
│ Patience before AI speaks  [----o------] 1.5 s           │
│                                         [ Enter room ]   │
└──────────────────────────────────────────────────────────┘
```

State:
```js
{ topic, customTopic, panelSize: 3, durationMin: 5,
  language: "english" | "hinglish", format: "general",
  patienceSec: 1.5 }
```

Rules:
- The AI notice is always visible (required by the problem statement).
- A custom topic overrides the selected chip.
- Panel is the first N of: Aarav, Meera, Kabir, Riya, Dev.
- Patience slider range 0.5-4 s, step 0.5. It sets the pause before the next AI turn.
- "Enter room" navigates to Room with the setup state.

### 5.2 Screen 2: Live room (`pages/Room.jsx`), the main demo screen

Layout:
```text
┌──────────────────────────────────────────────────────────┐
│ GD Arena      <topic>        [Middle round]     02:41    │
├──────────────────────────────────────────────────────────┤
│ [Moderator] [*Aarav*] [Meera] [Kabir] [You]              │
│  AI         speaking   AI      AI      mic on            │
├──────────────────────────────────────────────────────────┤
│ Transcript                                               │
│ Moderator: Let's begin...                                │
│ Meera: Automation lifts productivity, but...             │
│ You: I agree with Meera. We should also discuss...       │
│ Aarav: Companies will automate regardless...             │
│ You (live): but who pays for the train                   │
├──────────────────────────────────────────────────────────┤
│ Mic ok · Connected · AI idle   [type if mic fails]       │
│                         [Mute] [Captions] [End GD]       │
└──────────────────────────────────────────────────────────┘
```

Components:
- `ParticipantCard`: name, role label, "AI" tag, highlighted while speaking (`speaking === name`).
- `TranscriptPanel`: all turns plus the student's live interim text (muted style). Each turn has `id="turn-<id>"` so the Report can scroll to it.
- `Timer`: displays `timeLeft`, derived from the setup duration.
- Status row: mic status, online/offline, "AI thinking" indicator.
- Controls: mute, captions toggle, End GD, and a text input fallback (always present).

State:
```js
{
  transcript: [{ id, speaker, text, started_at, ended_at }],
  phase: "opening" | "middle" | "closing" | "ended",
  timeLeft,                 // seconds
  currentTurnId,            // integer, bumped on every interruption
  speaking,                 // name of the current AI speaker or null
  thinking,                 // true while /turn is in flight
  micStatus: "ok" | "denied" | "unsupported",
  online: true,
  interimText: ""
}
```

Behaviour:
- Phase comes from the frontend timer: `opening` at 0:00, `middle` after the moderator's opening, `closing` at ~80% of the duration, `ended` at 0.
- When the student stops speaking, wait `patienceSec`, then call `/turn`.
- When the student starts speaking (speech for more than ~400 ms) while an AI speaks: `speechSynthesis.cancel()`, bump `currentTurnId`, discard any in-flight reply that carries an old ID.
- Silent nudge: if the student has not spoken for 180 s during `middle`, show "You haven't spoken for 3 minutes. Look for an opening."
- Mic denied: show a message and keep the text input as the way to participate.
- Offline (`navigator.onLine === false`): pause TTS and show a banner.
- `/turn` fails: retry once, then the backend's canned fallback line is used. The room never freezes.
- When `ended`: call `/report` and navigate to Report.

### 5.3 Screen 3: Report (`pages/Report.jsx`)

Layout:
```text
┌──────────────────────────────────────────────────────────┐
│ Your GD report                                           │
├──────────────────────────────────────────────────────────┤
│ Speaking share (you + AI participants, moderator excl.)  │
│ You    ████░░░░░░░░░░░░  22%                             │
│ Aarav  ███████░░░░░░░░░  34%                             │
│ Meera  ██████░░░░░░░░░░  29%                             │
│ Kabir  ███░░░░░░░░░░░░░  15%                             │
├──────────────────────────────────────────────────────────┤
│ Building on others                         8 / 10        │
│ You acknowledged Meera and extended her point.           │
│ | "I agree with Meera. We should also discuss reskilling"│
│ Jump to turn 4 →                                         │
│                                                          │
│ Idea quality                               5 / 10        │
│ ...                                                      │
│ Handling interruptions                     N/A           │
│ No fair opportunity this session, so it isn't scored.    │
├──────────────────────────────────────────────────────────┤
│ Full transcript (each turn has an anchor id)             │
└──────────────────────────────────────────────────────────┘
```

Rules:
- Speaking share bars come from `metrics` (computed in Python from timestamps).
- Six category cards: starting, idea quality, building on others, listening, handling interruptions, ending.
- Each card shows score, feedback, exact quote, suggestion, and a "Jump to turn N" link that scrolls to `#turn-<id>` in the embedded transcript.
- `score: null` renders as N/A with the reason, never as 0.
- A card with a quote that failed backend validation is not shown with an invented quote.
- Demo numbers in mockups are samples; real values come from the session.

---

## 6. One turn, end to end

```text
Pause ends (patience timer)           [browser]
   ↓
STT final → save text + timestamps    [browser]
   ↓
POST /turn  (phase, last 6 turns)     [backend]
   ↓
Guards + LLM → {speaker, text}        [backend]
   ↓
Turn ID still current?                [browser]
   ├─ yes → speak aloud (TTS queue) → loop
   └─ no  → discard the late reply
```

Interruption is a separate event: student speech while an AI is speaking → `cancel()` + `currentTurnId++`. Any reply already in flight is now stale and gets discarded at the check above.

---

## 7. Folder structure

```text
gd-arena/
├── SPEC.md
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Setup.jsx        # topic, panel, duration, language, AI notice
│       │   ├── Room.jsx         # cards, transcript, timer, mic/text input
│       │   └── Report.jsx       # speaking share + quote-linked feedback
│       ├── components/
│       │   ├── ParticipantCard.jsx
│       │   ├── TranscriptPanel.jsx
│       │   └── Timer.jsx
│       ├── lib/
│       │   ├── speech.js        # STT start/stop, TTS queue, cancel()
│       │   ├── controller.js    # currentTurnId, phase, pause, nudge, retry
│       │   └── api.js           # fetch /turn, /report with timeout
│       └── App.jsx
└── backend/
    ├── main.py                  # FastAPI app, CORS, /health, /turn, /report
    ├── personalities.py         # Aarav, Meera, Kabir, Riya, Dev, Moderator prompts
    ├── turn.py                  # speaker guards + LLM call + fallback line
    ├── report.py                # metrics from timestamps + eval + quote validation
    ├── .env                     # API key (gitignored)
    └── requirements.txt
```

### Who owns what

| Thing | Where | Why |
|---|---|---|
| Transcript, phase, `currentTurnId` | Frontend (`controller.js`) | Backend stays stateless, nothing to sync on reconnect |
| Timer | Frontend | The AI never tracks time |
| Speaker rules (no same speaker back-to-back, force a silent participant) | Backend (`turn.py`) | In code, not left to the LLM |
| Speaking time, turns, words, share | Backend (`report.py`) | Computed in Python from timestamps, never by the LLM |
| Quote validation | Backend (`report.py`) | A quote that is not a substring of its turn is dropped |
| Failure handling (mic, offline, LLM fail) | Frontend + `turn.py` fallback | The room never freezes |

Known limitation: state lives in the frontend, so a page refresh ends the session. Saving the transcript to `localStorage` is a last-15-minutes task, not a core one.

---

## 8. API contract

### `POST /turn`
```json
IN:  {
  "topic": "string",
  "format": "general | case | abstract | controversial",
  "language": "english | hinglish",
  "panel": ["Aarav", "Meera", "Kabir"],
  "phase": "opening | middle | closing",
  "last_speaker": "Meera",
  "transcript": [{ "id": "t1", "speaker": "Student", "text": "..." }]
}

OUT: {
  "speaker": "Aarav",
  "text": "1-3 sentences",
  "intent": "challenge | agree | extend | redirect"
}
```
Rules:
- Send only the last ~6 turns.
- `max_tokens` about 80, timeout 8 s, one retry, then a canned fallback line.
- Validate the JSON. Never trust an arbitrary speaker name; it must be in `panel` (or the moderator in opening/closing).
- Never the same speaker twice in a row. If someone has been silent for 3+ turns, force that speaker.
- The prompt must say: "respond to {last_speaker}'s point" so the AIs talk to each other.

### `POST /report`
```json
IN:  { "topic": "...", "transcript": [
  { "id": "t1", "speaker": "Student", "text": "...",
    "started_at": 51.0, "ended_at": 58.4 } ] }

OUT: {
  "metrics": {
    "denominator_note": "Student + AI participants, moderator excluded",
    "speakers": [
      { "name": "Student", "seconds": 62, "turns": 5, "words": 140, "share_pct": 22 }
    ]
  },
  "categories": [
    { "category": "building_on_others", "score": 8,
      "feedback": "...", "turn_id": "t4",
      "quote": "exact text from turn t4", "suggestion": "..." }
  ]
}
```
Steps:
1. **Metrics in Python** from timestamps: speaking time, turns, words, share. State the denominator. Never let the LLM compute durations.
2. **One LLM call** across 6 categories: starting, idea quality, building on others, listening, handling interruptions, ending. Score 1-10 or `null` (N/A) if the student had no fair opportunity.
3. **Validate:** each `quote` must be a substring of the turn named by `turn_id`. Otherwise drop that point or attach the nearest real quote. Never invent quotes, timestamps, or statistics.
4. Do not claim to measure body language or vocal confidence.

---

## 9. AI personalities

Each participant has its own system prompt. Common rules in every prompt:
- Stay on topic. Don't agree with everything. Don't repeat earlier arguments.
- Sound like a student in a placement GD.
- 1-3 sentences. Return only the words spoken.
- Do not invent statistics or present unverified numbers as facts.

| Name | Role | Behaviour |
|---|---|---|
| Aarav | Dominator | Confident, assertive, challenges weak reasoning, longer turns |
| Meera | Data-driven | Evidence and logic, no invented statistics |
| Kabir | Quiet contributor | Speaks rarely, thoughtful insights |
| Riya | Creative | Examples, unconventional angles |
| Dev | Tangential | Drifts off topic, needs redirecting |
| Moderator | Separate role | Opens, keeps time, redirects, runs the closing round. Does not argue a side |

Voices: assign a distinct `speechSynthesis` voice (and pitch) per participant. Browser voices vary by device, so pick from `getVoices()` at runtime.

---

## 10. Build order (4 hours)

| Time | Step | Done when |
|---|---|---|
| 0:00-0:20 | Scaffold: Vite + Tailwind, FastAPI, CORS, `.env`, `GET /health` | Frontend shows "ok" from `/health` |
| 0:20-1:00 | Backend: `personalities.py`, `/turn`, `/report` | `curl` works for both endpoints |
| 1:00-2:00 | Frontend: Setup (+ AI notice), Room, text-only loop wired to `/turn`, phases from timer | You type, the AIs talk to each other, moderator opens and closes |
| 2:00-2:50 | Voice: TTS queue + voices, STT + live captions, interruption, patience slider | You speak, an AI answers aloud, you can cut it off mid-sentence |
| 2:50-3:30 | Report page + click-to-quote, cheap bonuses | Report shows real quotes from your session |
| 3:30-4:00 | Hardening: mic denied, LLM error, offline. Rehearse the demo twice, record a backup video | Nothing crashes when you deny the mic or unplug wifi |

Checkpoints:
- At ~1:00, test that the AIs respond to each other and not only to you. If they only answer you, fix the prompt (include the last 6 turns and say "respond to {last_speaker}'s point").
- At ~2:30, if voice input still isn't working, demo with typed input + TTS.

### Prompt order for the AI coding agent (one per step)
1. **Scaffold:** read SPEC.md; create `frontend/` and `backend/`, CORS for port 5173, key from `.env`, `GET /health` and a frontend call to it.
2. **`/turn`:** write `personalities.py` and `/turn` per section 8, with guards, 8 s timeout, one retry, canned fallback. Give a `curl` test.
3. **Setup + Room UI (mock data):** build screens 5.1 and 5.2 with hardcoded transcript.
4. **Text loop:** wire Room to `/turn`; student types, AIs respond to each other; phases from the timer.
5. **TTS:** distinct voice per participant, speech queue, speaking highlight.
6. **STT + interruption:** Chrome STT with live captions; on student speech call `cancel()`, bump `currentTurnId`, discard stale replies; patience slider.
7. **`/report` + Report page:** metrics in Python; LLM JSON; quote validation; click-to-scroll.
8. **Hardening:** mic denied fallback, backend/LLM error toast + retry, offline banner.

---

## 11. Demo script (3 minutes)

1. Show Setup and the AI notice.
2. Enter the room. The moderator opens.
3. Speak. An AI challenges you.
4. **Interrupt an AI mid-sentence** (the main moment).
5. Let the closing round run.
6. Open the report, click a quote, and jump to the transcript turn.

---

## 12. Rules for the AI coding agent

- Build only what is in this spec. One feature per prompt.
- Do not add a database, auth, WebSocket, or extra frameworks.
- Keep `currentTurnId` + a speech queue. No heavy state machine.
- When something breaks, fix the bug. Do not regenerate everything.
- Chrome-only is acceptable. Keep the text input as a permanent fallback.
- Commit after every working step.

## 13. Known risks

- Chrome STT/TTS is flaky. Test it in the first 30 minutes of the voice hour.
- AIs that only answer the student fail requirement 3. Test AI-to-AI interaction early.
- Hinglish STT (`hi-IN`) may transcribe badly. Test before promising it.
- Only claim what we measure. No body-language or vocal-confidence analysis.
- A late LLM response after an interruption must be discarded via the turn ID.
- Report quotes and scores in mockups are samples, never real data.
