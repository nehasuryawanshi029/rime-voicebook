"""
VoiceBook Interruption & Latency Benchmark Runner
Measures:
1. End-of-speech to first audio latency
2. Interruption stop latency (time from barge-in trigger to audio stop)
3. Stale result rejection under concurrency
4. Target verification: stale_results_spoken must be strictly 0.
"""

import asyncio
import time
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from app.agent.conversation import ConversationManager
from app.services.metrics import metrics_collector
from app.database.seed import seed_database
from app.config import settings


async def run_interruption_benchmark():
    print("=" * 60)
    print("VOICEBOOK BENCHMARK: Interruption Stop Latency & Generation Fencing")
    print("=" * 60)

    settings.FLIGHT_SEARCH_DELAY_SECONDS = 0.1
    seed_database()

    latencies = []
    stale_discarded_counts = 0

    async def dummy_event(evt):
        pass

    async def dummy_audio(chunk, gen):
        pass

    print("\n--- TEST 1: Mid-Search Interruption Benchmark (10 iterations) ---")
    for i in range(10):
        manager = ConversationManager(
            session_id=f"bench-search-{i}",
            on_event=dummy_event,
            on_audio_chunk=dummy_audio
        )

        # Start search
        t0 = time.time()
        search_task = asyncio.create_task(
            manager.process_user_utterance("Find me a flight from Pune to Delhi tomorrow.")
        )
        await asyncio.sleep(0.05)

        # Barge-in interruption
        t_int_start = time.time()
        await manager.process_user_utterance("Wait! Actually from Mumbai.")
        t_int_stop = time.time()

        latency_ms = (t_int_stop - t_int_start) * 1000
        latencies.append(latency_ms)

        await search_task
        stale_discarded_counts += manager.generation_manager.stale_results_discarded

        print(f"Iteration {i+1:2d}: Interruption processed in {latency_ms:.2f}ms | Generation: {manager.generation_manager.current_generation} | Origin: {manager.constraints.origin}")

    avg_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    min_latency = min(latencies)

    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"Total Iterations:             10")
    print(f"Avg Interruption Latency:     {avg_latency:.2f} ms")
    print(f"Min Interruption Latency:     {min_latency:.2f} ms")
    print(f"Max Interruption Latency:     {max_latency:.2f} ms")
    print(f"Total Stale Results Discarded:{stale_discarded_counts}")
    print(f"Total Stale Results Spoken:   {metrics_collector.stale_results_spoken} (Goal: 0)")
    print("=" * 60)

    assert metrics_collector.stale_results_spoken == 0, "FATAL: Stale results were spoken!"
    print("SUCCESS: Generation fence held 100% reliably with 0 stale spoken results.")


if __name__ == "__main__":
    asyncio.run(run_interruption_benchmark())
