# VoiceBook Hackathon Demo Walkthrough (4–5 Minutes)

This script provides an exact, reproducible sequence for judges and evaluators demonstrating **VoiceBook**.

---

## Demo Overview & Routes

- `/`: Landing page introducing the problem, solution, and architecture.
- `/assistant`: Main hero voice booking interface with the live Voice Orb, conversation history, and flight results.
- `/search`: Interactive flight inventory explorer querying local SQLite.
- `/bookings`: Confirmed reservations management with cancellation capabilities.
- `/trips/[id]`: Detailed digital boarding pass and itinerary.
- `/voice-lab`: Realtime engineering console with Rime TTS streaming and generation fencing.
- `/evaluation`: Deterministic acceptance criteria matrix (7/7 Pass) and live benchmark runner.
- `/about`: Project story and architecture.

---

## Live Demo Step-by-Step Sequence

### 0:00 – 0:45: Landing & Problem Overview
* **Speaker**:
  > *"VoiceBook is an interruptible conversational AI flight-booking agent designed for the Rime Hackathon. In real life, humans do not speak in rigid turns. We change our mind mid-sentence, correct routes while the system searches, and add constraints on the fly. Traditional bots lock up during tool calls or speak obsolete flights. VoiceBook uses generation fencing to ensure stale work is cancelled and discarded instantly."*
* **Visuals**:
  - Show the Landing page (`http://localhost:3000`).
  - Click **START VOICE BOOKING** or navigate to `/assistant`.

---

### 0:45 – 2:30: The Core Interruption Challenge (Pune → Under ₹5,000 → Actually Mumbai)
* **Visual**: On `/assistant`, notice the large **RUN INTERRUPTION DEMO** button and the active **Demo Delay (4s)** mode.
* **Option A (Automated 1-Click Verification)**:
  - Click **RUN INTERRUPTION DEMO**.
  - Watch the 3-step live sequence execute against the real backend:
    1. *"Find me a flight from Pune to Delhi tomorrow."*
    2. *"Under ₹5,000."*
    3. *"Wait — actually from Mumbai."*
* **Option B (Spoken or Typed Live)**:
  1. Speak or type: *"Find me a flight from Pune to Delhi tomorrow."*
  2. While the search is running: *"Under ₹5,000."*
  3. Barge in immediately: *"Wait — actually from Mumbai."*

* **System Reaction**:
  - **Generation Fencing**: Generation advances from 1 ➔ 2 ➔ 3.
  - **Sub-20ms Audio Abort**: Any in-flight Rime TTS playback halts immediately.
  - **Tool Cancellation**: The background Pune search is cancelled or marked stale.
  - **Context Continuity**: The new request keeps `destination: Delhi`, `date: tomorrow`, and `budget: 5000`, while updating `origin: Mumbai`.
  - **Zero Stale Audio**: The Pune results are **discarded** (`stale_results_discarded >= 1`), and `stale_results_spoken` stays at **0**.
  - **Authoritative Presentation**: VoiceBook displays and speaks only the Mumbai to Delhi flights under ₹5,000.

---

### 2:30 – 3:30: Flight Selection & Booking Flow
* **Action**: Click **Book Flight** on the cheapest flight card (or speak: *"Book the cheapest one"*).
* **System Reaction**:
  - Modal opens with passenger details.
  - Enter traveler name and confirm.
  - Booking is transacted in local SQLite database with unique ID (`VBK-XXXXXXXX`).
  - Click **View Boarding Pass** to navigate to `/trips/[id]`, showing the digital boarding pass, seat allocation, and baggage allowance.

---

### 3:30 – 4:30: Verification & Evaluation
* **Action**: Navigate to `/evaluation`.
* **Visuals**:
  - Point to the **7/7 Acceptance Criteria Matrix**:
    - ✓ Rime stops on interruption (< 20ms)
    - ✓ New instruction accepted
    - ✓ Old tool result discarded
    - ✓ Old generation cannot update UI
    - ✓ Old generation cannot speak
    - ✓ Latest generation authoritative
    - ✓ Final answer reflects latest request
  - Click **Run Live Benchmark** to observe measured roundtrip timestamps:
    - First Rime audio received (measured in ms)
    - Flight tool duration
    - Interruption stop latency
    - Stale results discarded vs spoken (0)

---

### 4:30 – 5:00: Voice Lab Telemetry
* **Action**: Navigate to `/voice-lab`.
* **Visuals**:
  - Review live Rime model (`mist`), speaker (`mist`), and streaming chunk pipeline.
  - Review Gemini 2.5 Flash intent parsing.
  - Inspect the real-time event audit log capturing every `llm_start`, `tool_start`, `interruption_detected`, `rime_stopped`, and `stale_result_discarded` event.
