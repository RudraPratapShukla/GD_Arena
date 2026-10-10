# GD Arena — AI Group Discussion Practice Suite

> **Problem Statement #2: GD Arena**

GD Arena is an autonomous AI-powered group discussion practice suite that simulates realistic, placement-style group discussions with diverse participant personas and an active fair moderator. Candidates practice speaking in English or Hinglish using browser speech recognition, experience real-time conversational balancing without interruptions, and receive granular post-session assessments featuring filler-word audits, talk-time equilibrium, and targeted next-round playbooks.

---

## 1. What It Does

GD Arena prepares students and job seekers for competitive campus placements and MBA admissions by immersing them in simulated group discussions against AI participants with distinct behavioral traits (assertive dominators, analytical data-drivers, quiet contributors, creative thinkers, and tangential speakers). The application listens to spoken input in real time, manages conversational turn-taking, diplomatically rebalances speaking opportunities when one person dominates, and delivers structured placement feedback with clickable quote anchors and actionable improvement formulas.

---

## 2. Done / Left / Plan

### What Works Now (Done)
- **Discussion Setup & Control Center**:
  - Selection of curated placement topics (Tech/AI, Socio-Digital, Abstract, Corporate Case Studies) or direct custom prompt entry.
  - Configurable panel density (3 to 5 AI peers plus human candidate).
  - Duration controls (3, 5, or 8 minutes) and timing thresholds (1.0s to 4.0s conversational patience).
  - Language selection: Standard English (`en-US`) and Romanized Hinglish (`en-IN` / `hi-IN`).
- **Autonomous Turn Orchestrator & Persona Engine**:
  - Deterministic turn-taking logic that prevents back-to-back repetitions and enforces diverse candidate participation.
  - Persona system with custom system instructions: Aarav (Dominator), Meera (Data-driven), Kabir (Quiet Contributor), Riya (Creative), Dev (Tangential), and Moderator.
  - Cascading model fallback architecture (Gemini 2.5 Flash &rarr; Gemini Flash Lite &rarr; non-repeating persona pools) ensuring 100% room uptime.
- **Smart Participation Balancer**:
  - Real-time airtime and turn calculation across all active speakers.
  - Dynamic **Fair Opportunity Index (FOI)** tracking room equilibrium.
  - Dominance warning detection (triggered when any participant exceeds ~35% share).
  - Fair Moderator interventions: Diplomatically steps in at turn boundaries to invite quieter speakers (*"What is your perspective on this, Student?"*) without cutting off confident speakers.
  - Clickable suggested prompt chip for students needing floor entry assistance.
- **Speech & Floor Control**:
  - Browser-native speech recognition (`webkitSpeechRecognition`) with Indian English (`en-IN`) code-switching.
  - Dynamic speech buffering with silence detection and manual floor control (`Hold Floor` / `Done Speaking`).
  - Web Speech synthesis with customized pitch and rate per participant.
- **Comprehensive Placement Report & AI Communication Coach**:
  - Executive evaluation summary synthesizing room dynamics.
  - Spoken airtime breakdown comparing actual student share against benchmark ranges (18% – 25%).
  - Filler word audit detecting frequencies and exact snippet contexts for *"umm"*, *"actually"*, and *"like"*.
  - Argument clarity, logical structure, and tone classification (collaborative vs. combative).
  - **Next GD Action Playbook**: 3 concrete behavioral targets with exact spoken sentence formulas.
  - Performance ratings out of 10 for every participant across 7 placement evaluation categories.
  - Clickable quote chips that auto-scroll to and highlight exact sentences in the transcript.

### What is Left for the Next 16 Hours (Left)
- Multiplayer human capability: Allowing 2–3 human candidates to join the same room alongside AI peers via WebRTC audio rooms.
- Non-verbal cue analysis: Optional camera-based posture and eye-contact auditing using lightweight client-side MediaPipe models.
- Cloud deployment and persistent database storage for cross-device session tracking.

### Plan to Finish It (Plan)
1. **Hours 1–4**: Deploy production build to cloud infrastructure (Vercel for frontend, Render/Railway for FastAPI backend).
2. **Hours 5–10**: Integrate WebRTC audio signaling to support hybrid human + AI multiplayer practice lobbies.
3. **Hours 11–14**: Add client-side visual engagement indicators (eye contact and head orientation) during live discussions.
4. **Hours 15–16**: Conduct cross-browser end-to-end smoke testing, record final demonstration walkthrough, and verify environment variable configurations.

---

## 3. Architecture and Why

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Vite + Tailwind CSS + Lucide + Web Speech STT/TTS)   │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
       HTTP /turn (Real-time)    HTTP /report (End of Session)
                │                        │
┌───────────────▼────────────────────────▼───────────────┐
│                    FastAPI Backend                     │
│               (Python 3.11 + Uvicorn)                  │
├────────────────────────────────────────────────────────┤
│  • Turn Orchestrator & Participation Balancer          │
│  • Persona System Prompts (English & Hinglish)         │
│  • Anti-Repetition Guard & Fallback Cascade Pool       │
│  • Comprehensive Report & Coach Engine                 │
└───────────────────────────▲────────────────────────────┘
                            │
                            ▼
              Google Gemini 2.5 Flash API
```

### Main Technical Choices & Rationale
- **FastAPI (Python 3.11)**:
  - *Why*: Asynchronous event loop (`async/await`) allows concurrent LLM requests and low latency. Python provides native access to the Google Generative AI SDK, UTF-8 stream handling, and robust linguistic metric computation.
- **React 19 + Vite + Tailwind CSS**:
  - *Why*: Sub-second build times and minimal client bundle footprint (<350 kB total). Tailwind provides complete control over the bespoke broadcast-studio palette (`Ink & Signal`) and responsive layouts without bloated external UI frameworks.
- **Real-Time Client-Driven Turn Orchestration**:
  - *Why*: Rather than introducing fragile WebSocket connection overhead on flaky campus Wi-Fi, the client manages a synchronized turn queue with unique turn IDs, silence debounce timers, and explicit floor holding. This delivers sub-second response times while preventing race conditions or stale audio playback.
- **AI Model (Google Gemini 2.5 Flash)**:
  - *Why*: Fast time-to-first-token (sub-800ms generation), strict adherence to structured JSON schemas, and exceptional bilingual fluency in colloquial Romanized Hinglish.
- **Zero-Cost Client-Side Speech Processing**:
  - *Why*: Utilizes browser-native Web Speech API for real-time STT and TTS. This eliminates third-party audio transmission latency, protects student audio privacy, and ensures the application runs cost-effectively.

---

## 4. What We Added (Beyond the Brief)

1. **Smart Participation Balancer**:
   - Rather than treating the AI as an unfeeling judge that merely scores at the end, the system includes a live **Fair Moderator Engine**. It computes the Fair Opportunity Index, flags airtime dominance, and actively invites underrepresented participants to speak at natural conversational boundaries.
2. **Native Hinglish Support**:
   - Real-world placement group discussions in Indian engineering and management colleges frequently involve natural code-switching. GD Arena natively generates Romanized Hinglish for AI peers and configures dual-dialect speech recognition (`en-IN` / `hi-IN`).
3. **Interactive Transcript Quote Chips**:
   - In the evaluation report, every critical feedback point is tied to a clickable quote chip that smoothly scrolls the transcript to the exact line and temporarily highlights it with an animated accent border.
4. **Actionable Next GD Playbook**:
   - Instead of abstract advice like *"be more concise"*, the AI provides concrete verbal formulas (e.g., *"To build a structured baseline for the group, let's examine both the economic feasibility and user adoption challenges."*) that students can memorize and apply immediately.

---

## 5. How to Run It

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **Browser**: Google Chrome, Microsoft Edge, or Chromium-based browser (recommended for Web Speech API support)

### 1. Clone the Repository
```bash
git clone https://github.com/RudraPratapShukla/GD_Arena.git
cd GD_Arena
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp ../.env.example .env
# Edit .env and insert your GEMINI_API_KEY

# Start backend server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be available at `http://127.0.0.1:8000` (Health check: `http://127.0.0.1:8000/health`).

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

*(Live deployment URL will be updated here once hosted.)*

---

## 6. Tools and AI Used

### Libraries & Frameworks
- **Backend**: FastAPI, Uvicorn, Google Generative AI Python SDK (`google-generativeai`), Pydantic, Python-dotenv.
- **Frontend**: React 19, React Router v7, Vite, Tailwind CSS, Lucide React (`lucide-react`).

### AI Models & APIs
- **Google Gemini 2.5 Flash**: Primary model for autonomous persona generation, conversational reaction turns, and detailed report synthesis.
- **Google Gemini Flash Lite**: High-speed fallback model for turn generation under network or rate-limit constraints.
- **Web Speech STT (`webkitSpeechRecognition`)**: Client-side speech-to-text with dual-locale support (`en-US` and `en-IN`).
- **Web Speech TTS (`SpeechSynthesisUtterance`)**: Client-side multi-voice synthesis mapped to distinct participant personas.

### AI Transparency & Disclosure
Users are explicitly notified at multiple levels that they are interacting with AI participants:
- Top status headers clearly indicate `AI-POWERED GROUP DISCUSSION PRACTICE` and `AI Participants`.
- Every participant card features an AI role badge (e.g., `Aarav: Dominator`, `Meera: Data-driven`, `Moderator: Fair Facilitator`).
- Real-time status bars state `AI formulating next turn...` when generative inference is active.
- The evaluation report clearly attributes feedback to the `AI Communication Coach`.

---

## 7. Who It Is For

- **Campus Placement Aspirants**: Engineering and undergraduate students facing competitive on-campus mass recruiter and product company GD rounds.
- **MBA & Business School Candidates**: Aspirants preparing for CAT, XAT, and executive MBA admissions group discussions where structured arguments, synthesis, and leadership matter.
- **Quieter & Hesitant Communicators**: Students who feel intimidated in human group discussions and need a pressure-free simulator to practice asserting their perspective and overcoming filler-word habits.
- **Why They Come Back**:
  - Safe, private sandbox to test controversial viewpoints or weak speaking skills without social anxiety.
  - Realistic sparring against combative peers (like Aarav) and analytical counterparts (like Meera).
  - Clear, measurable progress targets that tell candidates exactly what verbal formula to execute in their next round.
