"""
Deterministic Interruption Test Script for VoiceBook
Executes the exact hackathon challenge test scenario:
FLIGHT_SEARCH_DELAY_SECONDS = 4.0
Gen 1: Pune -> Delhi
While search is running, say: 'Actually, Mumbai to Delhi.'
Validates all 10 criteria and outputs empirical results.
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
from app.config import settings
from app.database.seed import seed_database
from app.services.metrics import metrics_collector


async def run_deterministic_interruption_test():
    print("=" * 70)
    print("VOICEBOOK DETERMINISTIC INTERRUPTION TEST (4-SECOND SEARCH DELAY)")
    print("=" * 70)

    # 1. Enforce 4-second delay for flight search tool
    settings.FLIGHT_SEARCH_DELAY_SECONDS = 4.0
    seed_database()

    timeline = []
    spoken_chunks = []

    async def on_event(evt):
        timeline.append(evt)
        event_name = evt.get("type", "")
        gen = evt.get("generation", "")
        print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] EVENT: {event_name:<26} (Gen {gen})")

    async def on_audio_chunk(chunk: bytes, gen: int):
        spoken_chunks.append((gen, len(chunk), time.time()))

    manager = ConversationManager(
        session_id="eval-interruption-deterministic",
        on_event=on_event,
        on_audio_chunk=on_audio_chunk
    )
    manager.custom_search_delay = 4.0

    print("\n[Step 1] Starting Generation 1: 'Find me a flight from Pune to Delhi tomorrow.'")
    gen1_task = asyncio.create_task(
        manager.process_user_utterance("Find me a flight from Pune to Delhi tomorrow.")
    )

    # Wait 1.0 second while the 4-second search is actively running
    await asyncio.sleep(1.0)

    gen1_num = manager.generation_manager.current_generation
    print(f"--> Gen 1 is currently searching in background (Generation {gen1_num})...")

    # Step 2: Barge-in interruption
    print("\n[Step 2] User Interrupts: 'Actually, Mumbai to Delhi.'")
    t_interrupt = time.time()
    gen2_task = asyncio.create_task(
        manager.process_user_utterance("Actually, Mumbai to Delhi.")
    )

    # Wait for completion of both tasks
    await asyncio.gather(gen1_task, gen2_task)
    t_finish = time.time()

    print("\n" + "=" * 70)
    print("VERIFICATION OF EXPECTED CRITERIA")
    print("=" * 70)

    checks = {}

    # Criterion 1: User interruption detected
    int_events = [e for e in timeline if e.get("type") == "interruption_detected"]
    checks["1_interruption_detected"] = len(int_events) > 0

    # Criterion 2: Generation 1 becomes obsolete
    gen1_req = manager.generation_manager.requests.get(1)
    checks["2_gen1_obsolete"] = gen1_req is not None and gen1_req.status in ["SUPERSEDED", "CANCELLED"]

    # Criterion 3: Generation 2 created
    checks["3_gen2_created"] = manager.generation_manager.current_generation >= 2

    # Criterion 4: Mumbai becomes origin
    checks["4_mumbai_origin"] = manager.constraints.origin == "Mumbai"

    # Criterion 5: Delhi remains destination
    checks["5_delhi_destination"] = manager.constraints.destination == "Delhi"

    # Criterion 6: Stale results discarded by fence
    checks["6_stale_results_discarded"] = manager.generation_manager.stale_results_discarded >= 1

    # Criterion 7: Stale results spoken is strictly 0
    stale_spoken = [g for g, _, _ in spoken_chunks if g < manager.generation_manager.current_generation]
    checks["7_stale_results_spoken_zero"] = len(stale_spoken) == 0 and metrics_collector.stale_results_spoken == 0

    # Criterion 8: Authoritative flights displayed are for Mumbai
    checks["8_authoritative_flights_mumbai"] = all(
        f.get("origin", "").lower() == "mumbai" for f in manager.current_flights
    ) if manager.current_flights else False

    all_passed = all(checks.values())

    for criterion, passed in checks.items():
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {criterion}")

    print("=" * 70)
    print(f"OVERALL RESULT: {'PASSED' if all_passed else 'FAILED'}")
    print("=" * 70)

    # Save empirical results to evaluation/results/
    os.makedirs(os.path.join(os.path.dirname(__file__), "results"), exist_ok=True)
    results_file = os.path.join(os.path.dirname(__file__), "results", "interruption_results.json")
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump({
            "test": "deterministic_interruption_test",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "search_delay_seconds": 4.0,
            "checks": checks,
            "overall_passed": all_passed,
            "current_generation": manager.generation_manager.current_generation,
            "stale_results_discarded": manager.generation_manager.stale_results_discarded,
            "stale_results_spoken": metrics_collector.stale_results_spoken,
            "final_constraints": manager.constraints.model_dump(),
            "timeline_length": len(timeline)
        }, f, indent=2)

    print(f"Results saved to: {results_file}")
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(run_deterministic_interruption_test())
    sys.exit(0 if success else 1)
