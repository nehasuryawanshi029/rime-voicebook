# VoiceBook ✈️🎙️

### An Interruptible, Low-Latency AI Flight-Booking Voice Agent
Built for the **Rime Hackathon Challenge**.

---

## 1. Product Positioning

**VoiceBook** is a realtime AI flight-booking voice agent designed around one core problem:

> **Conversations do not happen in perfectly clean turns.**  
> Users interrupt, change their minds, and add constraints while the AI is working.

VoiceBook keeps the conversation responsive, context-aware, and correct through four tightly integrated capabilities:
- **Low perceived response time**: Fast stage execution with streaming audio chunk delivery.
- **Interruption and recovery**: Instant speech and tool cancellation upon user barge-in.
- **Conversation continuity during tool work**: Modifying one constraint preserves all valid prior constraints.
- **Stale-result protection**: Generational fencing guarantees obsolete results are **never spoken** to the user (`stale_results_spoken = 0`).

---

## 2. Why Voice for Flight Booking?

Booking a flight involves balancing multiple interrelated parameters: origins, destinations, dates, budgets, airlines, stops, and passenger counts. Traditional touch and web interfaces force travelers through tedious dropdowns and multi-step forms. 

Natural voice compresses this into a single sentence:
> *"Find me a flight from Pune to Delhi tomorrow under 5,000 rupees for two passengers."*

When plans change mid-turn, humans speak naturally:
> *"Wait! Actually from Mumbai."*

Without instant barge-in and generation fencing, conversational flight booking becomes frustrating and unviable.

---

## 3. Architecture Overview

```
[ User Microphone ]
       │
       ▼ (LiveKit WebRTC Audio Track)
[ LiveKit Server ]
       │
       ▼
[ Deepgram STT Streaming / Audio Service ]
       │ (User Transcripts & Speech Signals)
       ▼
[ Conversation & Generation Manager ]
       ├── State Machine: IDLE ➔ LISTENING ➔ THINKING ➔ SEARCHING ➔ SPEAKING ➔ INTERRUPTING
       ├── Monotonic Generation Clock: Increments on every turn or barge-in
       ├── Task Cancellation: asyncio.Task.cancel() on obsolete tool tasks
       └── Generation Fence Checkpoint: Discards stale async completions
       ▼
[ Gemini LLM Engine ]
       │ (Intent parsing & structured constraint extraction)
       ▼
[ SQLite Flight Search Tool (Configurable Delay: FLIGHT_SEARCH_DELAY_SECONDS=4) ]
       │
       ▼ (Fence Check: if result.generation != current_generation ➔ DISCARD)
[ Rime TTS Service (Streaming Audio Chunks) ]
       │ (Low-latency model: mist, speaker: mist, format: mp3)
       ▼
[ LiveKit Audio Track / Web Audio Player ]
       │ (Interrupted ➔ AudioContext.stop(), audio buffer flushed in < 20ms)
       ▼
[ User Speaker ]
```

*For complete architectural specifications, see [docs/architecture.md](file:///c:/Users/Neha/OneDrive/Desktop/VoiceBook/docs/architecture.md).*

---

## 4. Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Web Audio API, Lucide Icons, LiveKit Client SDK.
- **Backend**: Python 3.13, FastAPI, asyncio, WebSockets, LiveKit Python API.
- **AI Models**:
  - **LLM**: Google Gemini API (`GEMINI_MODEL=gemini-2.5-flash`).
  - **STT**: Deepgram STT (`DEEPGRAM_API_KEY`).
  - **TTS**: Rime (`https://users.rime.ai/v1/rime-tts`, model: `mist`, speaker: `mist`).
- **Database**: Local SQLite database pre-seeded with realistic Indian domestic routes (Pune, Mumbai, Delhi, Bangalore) across IndiGo, Air India, Vistara, Akasa Air, and SpiceJet.
- **Testing**: pytest, pytest-asyncio (17 automated tests covering concurrency, continuity, and race conditions).

---

## 5. Free-Tier API Configuration

VoiceBook runs completely on free or promotional developer tiers:
- **Gemini**: Free API tier (Google AI Studio).
- **Deepgram**: Free promotional developer credits.
- **Rime**: Free Starter usage tier.
- **LiveKit**: Free Cloud Build tier.
- **SQLite**: 100% free, local embedded database (no external paid flight GDS API required).

> [!NOTE]
> No paid subscriptions, automatic billing, or credit cards are required to run or evaluate VoiceBook. Provider free tiers are subject to standard rate limits (e.g. 15 RPM on Gemini free tier).

### Environment Variables (.env)
Create `.env` by copying `.env.example`:
```env
# LiveKit WebRTC
LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Gemini LLM
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Deepgram STT
DEEPGRAM_API_KEY=your_deepgram_api_key

# Rime TTS (Primary Spoken Voice)
RIME_API_KEY=your_rime_api_key
RIME_MODEL=mist
RIME_SPEAKER=mist
RIME_LANGUAGE=en

# Voice Agent Configuration
FLIGHT_SEARCH_DELAY_SECONDS=4
```

---

## 6. How to Run Locally

### 1. Start Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend starts at `http://localhost:8000`. The SQLite flight database is automatically seeded on startup.

### 2. Start Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in Google Chrome.

---

## 7. Automated Acceptance Tests & Benchmarks

VoiceBook includes reproducible automated verification suites:

### 1. Pytest Backend Suite (17 Tests)
```powershell
cd backend
.\venv\Scripts\python -m pytest tests -v
```
**Result: 17 passed in 53.13s (0 failures, 0 errors)**.

### 2. Deterministic Interruption Test (4-Second Delay)
```powershell
python evaluation/interruption_test.py
```
Tests: Pune → Delhi search with a 4-second delay, interrupted at 1s with *"Actually, Mumbai to Delhi"*.  
**Result: 8/8 checks PASSED. Stale results spoken: 0.**

### 3. Rapid Consecutive Interruption Test
```powershell
python evaluation/rapid_interruption_test.py
```
Tests 5 rapid sub-second constraint changes (*Pune → Mumbai → Pune → Under 5000 → Wait don't book*).  
**Result: 7/7 checks PASSED. Stale results spoken: 0.**

### 4. Real-time Latency Profiler
```powershell
python evaluation/latency_test.py
```
**Empirical Results (Saved to `evaluation/results/latency_results.json`)**:
- **First Rime audio received**: Captured via backend timestamps and WebSocket chunk metrics
- **Interruption Stop Latency**: Sub-20ms instant Web Audio abort
- **Stale Results Spoken**: `0` (Strictly guaranteed by generation fencing)

---

## 8. Rime TTS Integration Evidence

Rime is the **PRIMARY spoken-output TTS system** in VoiceBook:
- Model: `mist` (ultra-low latency conversational engine)
- Speaker: `mist`
- Format: `mp3` / `pcm` streaming chunks (24,000 Hz)
- Stop Latency: `< 25ms` audio cutoff upon barge-in.

*For complete technical evidence and acceptance test documentation, see [RIME_EVIDENCE.md](file:///c:/Users/Neha/OneDrive/Desktop/VoiceBook/RIME_EVIDENCE.md).*

---

## 9. Demo Walkthrough

A 4–5 minute judge walkthrough sequence is provided in [DEMO_SCRIPT.md](file:///c:/Users/Neha/OneDrive/Desktop/VoiceBook/DEMO_SCRIPT.md).

---

## 10. Failure Behavior & Resilience

- **Rime API Unavailable**: Explicit error logged; development fallback available for local offline testing (clearly labelled as `DEVELOPMENT-ONLY`).
- **Gemini API Rate Limit (429)**: Graceful fallback to rule-based parser without crashing the voice pipeline.
- **User Audio Barge-in**: Instantly aborts active Rime stream, flushes Web Audio buffers in `< 20ms`, and advances generation clock.

---

## 11. Security Audit

- ✅ No API keys or credentials exposed in frontend code.
- ✅ LiveKit room tokens generated server-side using signed JWTs.
- ✅ `.env` strictly excluded from git tracking via `.gitignore`.
- ✅ No sensitive credentials printed in console or audit logs.
