# VoiceBook System Architecture & Concurrency Model

## 1. End-to-End Realtime Architecture

VoiceBook is designed for **full-duplex conversational voice** interaction. Unlike turn-based chatbot architectures, VoiceBook allows simultaneous audio streaming, speech recognition, intent parsing, tool execution, and audio playback.

```
+-------------------------------------------------------------------------------+
|                               USER WORKSTATION                                |
|                                                                               |
|  [ User Microphone ] ───(Browser Audio)────────┐                              |
|                                                │                              |
|  [ User Speaker ]   ◄───(Web Audio Chunks)─────┼───────────────────────────┐  |
|                                                │                           │  |
|  [ Next.js UI Dashboard ]                      │                           │  |
|    - Visual Waveform                           │                           │  |
|    - Live Dialogue                             │                           │  |
|    - Active Constraints                        │                           │  |
|    - Flight Results                            │                           │  |
|    - Voice Engineering Telemetry & Timeline    │                           │  |
+────────────────────────────────────────────────┼───────────────────────────┼──+
                                                 │                           │
                                         (WebSocket)                    (WebSocket)
                                                 │                           │
+────────────────────────────────────────────────▼───────────────────────────┼──+
|                              VOICEBOOK BACKEND                             │  |
|                                                                            │  |
|  1. Audio Transport:                                                       |  |
|     Browser Web Speech API ➔ FastAPI WebSocket (Transcripts Only)          |  |
|                                │                                           |  |
|  2. Turn & Barge-in Detector: ─┴────────────────────────────────────────┐  │  |
|     - Speech Start / End Detection                                      │  │  |
|     - Mid-speech / Mid-search Barge-in Trigger                          │  │  |
|                                                                         │  │  |
|  3. Conversation & Generation Manager: ◄────────────────────────────────┘  │  |
|     ├── Monotonic Generation Clock: Generation N ➔ N + 1                    │  |
|     ├── State Machine: IDLE ➔ LISTENING ➔ THINKING ➔ SEARCHING ➔ SPEAKING   │  |
|     ├── Task Cancellation: asyncio.Task.cancel() on active background tool  │  |
|     └── Generation Fencing Guard: Blocks stale async results                │  |
|                                                                            │  |
|  4. Intent Engine (Gemini LLM):                                            │  |
|     - Fast structured extraction (`gemini-2.5-flash`)                      │  |
|     - Constraint continuity preservation                                   │  |
|                                                                            │  |
|  5. Domain Tools (SQLite Flights Database):                                │  |
|     - search_flights(origin, destination, budget, passengers, gen)         │  |
|     - Simulated Delay (`FLIGHT_SEARCH_DELAY_SECONDS=4.0`)                  │  |
|     - Generation Checkpoint: if gen != current_gen ➔ DISCARD               │  |
|                                                                            │  |
|  6. Spoken Output Engine (Rime TTS):                                       │  |
|     - Dedicated Rime API Service (`https://users.rime.ai/v1/rime-tts`)     │  |
|     - Streaming chunk delivery (`audioFormat: mp3`, model: `mist`)         │  |
|     - Abort Signal Check: Stops stream immediately upon barge-in ──────────┘  |
+───────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Interruption & Generational Fencing Model

When conversations occur naturally, users often correct constraints mid-sentence or mid-search:
> **User**: *"Find me flights from Pune to Delhi tomorrow."*  
> *(Search tool begins with a 4-second simulated delay)*  
> **User**: *"Actually, from Mumbai."*

```
t=0.0s   User: "Pune to Delhi"
         │
         ├── STT Final ➔ Gen 1 Created
         ├── LLM Intent ➔ Origin: Pune, Destination: Delhi
         └── search_flights_tool(origin="Pune", generation=1) begins [4s delay]
                 │
t=1.0s           │   User: "Actually, from Mumbai."
                 │   │
                 │   ├── 1. Barge-in Detected for Gen 1
                 │   ├── 2. Gen 1 marked SUPERSEDED / CANCELLED
                 │   ├── 3. search_flights_tool(Gen 1) task cancelled via asyncio.Task.cancel()
                 │   ├── 4. Active Rime TTS stream aborted (abort_event.set())
                 │   ├── 5. Client Web Audio playback stopped immediately (< 25ms)
                 │   ├── 6. Generation Clock increments: Gen 1 ➔ Gen 2
                 │   ├── 7. LLM extracts new origin: Mumbai (Destination Delhi preserved)
                 │   └── 8. search_flights_tool(origin="Mumbai", generation=2) begins
                 │
t=1.1s   ◄───────┘   [Gen 1 Tool Task finishes / returns or raises CancelledError]
                     │
                     └── GENERATION FENCE CHECK:
                         if task.generation (1) != current_generation (2):
                             - Result discarded immediately
                             - stale_results_discarded += 1
                             - Stale results NEVER reach the UI
                             - Stale results NEVER trigger Rime TTS
                             - stale_results_spoken remains strictly 0

t=5.0s   Gen 2 Tool Completes:
         └── Generation matches authoritative clock (2 == 2)
             - Authoritative Mumbai flights presented to UI
             - Rime TTS synthesizes spoken response for Mumbai
```

---

## 3. Concurrency Guarantees

1. **Safety**: Stale flight results and obsolete audio frames cannot mutate authoritative state or play through user speakers.
2. **Liveness**: The async loop is never blocked by network calls or database operations. All tools use asynchronous sleep slices and non-blocking IO.
3. **Continuity**: Constraints from prior turns (dates, passengers, price limits) are merged incrementally and retained unless explicitly superseded.
