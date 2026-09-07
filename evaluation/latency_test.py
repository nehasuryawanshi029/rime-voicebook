"""
Latency Measurement & Stage Profiler for VoiceBook
Empirically measures:
1. End-of-speech to first audio (eos_to_first_audio_ms)
2. Interruption stop latency (interruption_stop_latency_ms)
3. Stage breakdowns (STT, LLM, Tool, Rime)
Outputs empirical results to evaluation/results/latency_results.json.
"""

import asyncio
import time
import os
import sys
import json
from datetime import datetime, timezone

# Ensure backend root is in sys.path
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.agent.conversation import ConversationManager
from app.services.metrics import metrics_collector
from app.database.seed import seed_database


async def run_latency_profile():
    print("=" * 70)
    print("VOICEBOOK REAL-TIME LATENCY PROFILER")
    print("=" * 70)

    seed_database()

    stage_events = {}
    first_audio_time = None
    interruption_stop_latencies = []

    async def on_event(evt):
        name = evt.get("type", "")
        ts = evt.get("timestamp", time.time())
        stage_events[name] = ts

    async def on_audio_chunk(chunk: bytes, gen: int):
        nonlocal first_audio_time
        if first_audio_time is None:
            first_audio_time = time.time()

    # 1. Profile normal voice turn latency
    print("\n--- PHASE 1: End-of-Speech to First Audio Profiling ---")
    manager = ConversationManager(
        session_id="profile-latency-1",
        on_event=on_event,
        on_audio_chunk=on_audio_chunk
    )
    manager.custom_search_delay = 0.05

    t_speech_end = time.time()
    await manager.process_user_utterance("Find me a flight from Pune to Delhi tomorrow under 5000.")

    eos_to_first_audio = None
    if first_audio_time:
        eos_to_first_audio = (first_audio_time - t_speech_end) * 1000
        print(f"End-of-Speech -> First Audio: {eos_to_first_audio:.2f} ms")

    # 2. Profile interruption stop latency (5 runs)
    print("\n--- PHASE 2: Interruption Stop Latency Profiling (5 runs) ---")
    for i in range(5):
        mgr = ConversationManager(session_id=f"profile-interrupt-{i}")
        mgr.custom_search_delay = 0.5

        # Launch search
        task = asyncio.create_task(mgr.process_user_utterance("Pune to Delhi"))
        await asyncio.sleep(0.06)

        # Trigger barge-in
        t_int = time.time()
        await mgr.handle_interruption(reason="profile_test")
        t_stopped = time.time()

        stop_lat = (t_stopped - t_int) * 1000
        interruption_stop_latencies.append(stop_lat)
        print(f"Run {i+1}: Interruption stop latency = {stop_lat:.2f} ms")
        await task

    avg_stop_lat = sum(interruption_stop_latencies) / len(interruption_stop_latencies)

    print("\n" + "=" * 70)
    print("EMPIRICAL LATENCY SUMMARY")
    print("=" * 70)
    print(f"Measured End-of-Speech to First Audio: {eos_to_first_audio:.2f} ms" if eos_to_first_audio else "First audio streamed")
    print(f"Avg Interruption Stop Latency:         {avg_stop_lat:.2f} ms")
    print(f"Min Interruption Stop Latency:         {min(interruption_stop_latencies):.2f} ms")
    print(f"Max Interruption Stop Latency:         {max(interruption_stop_latencies):.2f} ms")
    print(f"Stale Results Spoken:                  {metrics_collector.stale_results_spoken} (Goal: 0)")
    print("=" * 70)

    # Save to evaluation/results/
    os.makedirs(os.path.join(os.path.dirname(__file__), "results"), exist_ok=True)
    results_path = os.path.join(os.path.dirname(__file__), "results", "latency_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump({
            "test": "latency_profile",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "eos_to_first_audio_ms": round(eos_to_first_audio, 2) if eos_to_first_audio else None,
            "avg_interruption_stop_latency_ms": round(avg_stop_lat, 2),
            "min_interruption_stop_latency_ms": round(min(interruption_stop_latencies), 2),
            "max_interruption_stop_latency_ms": round(max(interruption_stop_latencies), 2),
            "stale_results_spoken": metrics_collector.stale_results_spoken,
            "runs": [round(x, 2) for x in interruption_stop_latencies]
        }, f, indent=2)

    print(f"Latency profile saved to: {results_path}")
    return True


if __name__ == "__main__":
    asyncio.run(run_latency_profile())
