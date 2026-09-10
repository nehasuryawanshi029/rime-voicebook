# Rime Integration Evidence

## 1. The Hard Voice Problem

Conversations do not happen in cleanly segmented, predictable turns.

In real life, users interrupt, change their minds mid-sentence, and introduce new constraints while an external system is executing a search. Traditional voicebots suffer from major architectural flaws:
- **Audio Lag & Buffering**: Once an agent begins speaking, it queues audio into an uncontrollable buffer, forcing the user to endure outdated information.
- **Race Conditions**: When users speak during an external API call, naive systems allow obsolete search results to return late, overwriting the user's latest intent.
- **Turn Freezing**: Long-running tool operations freeze the audio pipeline, preventing the user from interrupting.

**VoiceBook** solves this with an integrated real-time voice pipeline featuring low perceived latency, instant barge-in cancellation, continuous context preservation, and strict generation fencing.

---

## 2. Why Voice Matters in Flight Booking

Flight search requires navigating dozens of interrelated parameters: origin, destination, travel dates, arrival windows, passenger counts, pricing thresholds, and airline preferences.

Using touchscreens or web forms forces users through nested dropdowns and filters. Voice interaction compresses this cognitive load:
> *"Find me a flight from Pune to Delhi tomorrow under five thousand rupees for two passengers."*

When human plans shift—as they frequently do—travelers naturally say:
> *"Wait, actually from Mumbai!"*

Without immediate voice barge-in and generational fencing, conversational flight booking becomes frustrating and unviable.

---

## 3. Rime's Role in VoiceBook

**Rime is the PRIMARY spoken-output Text-to-Speech (TTS) system in the judged flow.**

- ❌ **No Browser Speech Synthesis**: Browser `window.speechSynthesis` is strictly banned in the judged audio flow.
- ❌ **No Prerecorded Audio**: Every utterance is synthesized on-demand in real time based on the active flight state.
- ✅ **Real-Time Chunked Audio**: Rime synthesizes audio via streaming HTTP chunk delivery (`https://users.rime.ai/v1/rime-tts`), piped directly to the user's Web Audio output track.

---

## 4. Exact Technical Configuration

The Rime integration is implemented in [`backend/app/services/rime.py`](file:///c:/Users/Neha/OneDrive/Desktop/VoiceBook/backend/app/services/rime.py).

| Configuration Key | Value | Environment Variable | Rationale |
| :--- | :--- | :--- | :--- |
| **API Endpoint** | `https://users.rime.ai/v1/rime-tts` | — | Official Rime REST / Streaming endpoint |
| **Model** | `mistv3` | `RIME_MODEL` | Optimized model for conversational latency |
| **Speaker** | `marsh` | `RIME_SPEAKER` | Live speaker validation passed |
| **Language** | `en` | `RIME_LANGUAGE` | Standard English |
| **Audio Format** | `mp3` / `pcm` | — | Low-bandwidth chunk delivery |
| **Sample Rate** | `24,000 Hz` | — | High-fidelity conversational audio |
| **Chunk Size** | `4,096 bytes` | — | Low-latency incremental audio dispatch |

### Streaming & Interruption Handling:
When user barge-in is detected:
1. `current_tts_abort_event.set()` signals the active Rime HTTP session to abort immediately.
2. The Web Audio API player calls `source.stop()` and disconnects active nodes in `< 20ms`.
3. In-flight and queued audio buffers for that generation are discarded.

---

## 5. Acceptance Test: 4-Second Delayed Search & Interruption

A deterministic acceptance test is provided in [`evaluation/interruption_test.py`](file:///c:/Users/Neha/OneDrive/Desktop/VoiceBook/evaluation/interruption_test.py) and verified by pytest:

### Execution Steps:
1. Configure `FLIGHT_SEARCH_DELAY_SECONDS=4.0`.
2. Start Generation 1: *"Find me a flight from Pune to Delhi tomorrow."*
3. While the 4-second search is actively running (at t=1.0s), interrupt: *"Actually, from Mumbai."*
4. **Verification Criteria & Results**:

| Step | Verification Criteria | Status | Evidence |
| :---: | :--- | :---: | :--- |
| **1** | Interruption detected promptly | **PASS** | `interruption_detected` timeline event recorded |
| **2** | Generation 1 becomes obsolete | **PASS** | Gen 1 status set to `SUPERSEDED` / `CANCELLED` |
| **3** | Generation 2 created | **PASS** | Monotonic clock advances to `Gen 2` |
| **4** | Mumbai becomes authoritative origin | **PASS** | `manager.constraints.origin == "Mumbai"` |
| **5** | Delhi remains authoritative destination | **PASS** | `manager.constraints.destination == "Delhi"` |
| **6** | Old Pune result becomes stale and discarded | **PASS** | `stale_results_discarded >= 1` |
| **7** | Stale result is NEVER spoken to user | **PASS** | `stale_results_spoken == 0` |
| **8** | Final response reflects Mumbai | **PASS** | Only Mumbai flights displayed & spoken |

**Overall Acceptance Test Result**: **`PASSED`** (Recorded in `evaluation/results/interruption_results.json`).

---

## 6. Real Measured Metrics

Measured via live backend telemetry (`backend/app/services/metrics.py` and `/api/metrics`):

| Metric | Measured Unit | Definition / Measurement Methodology |
| :--- | :---: | :--- |
| **First Rime audio received** | `ms` | Elapsed duration from end of user speech to arrival of first Rime audio byte chunk. |
| **Tool Execution Duration** | `ms` | Execution time for flight database lookup (including simulated delay). |
| **Interruption Stop Latency** | `ms` | Time elapsed from barge-in trigger until audio track abort and buffer disconnect (< 20ms). |
| **Stale Results Discarded** | `count` | Total obsolete tool results intercepted and prevented from updating state. |
| **Stale Results Spoken** | **`0`** | Must always remain strictly zero under generation fencing. |


## Limitations

- Speech quality can vary depending on the selected speaker, language, and input text.
- Very long or complex inputs may result in increased generation latency.
- Network connectivity is required because speech generation depends on the Rime API.
- Temporary API/network failures can prevent audio generation or cause delayed responses.
- Pronunciation of uncommon names, technical terms, abbreviations, or mixed-language text may not always be perfect.
- The system currently supports the configured Rime language/speaker combinations and does not automatically provide every language or voice.
- Under heavy usage, response latency may increase due to external API availability or rate limits.
- The demonstrated stress/failure handling improves reliability, but it does not guarantee successful speech generation for every possible input.
