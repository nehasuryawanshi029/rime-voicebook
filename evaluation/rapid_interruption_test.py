"""
Deterministic Rapid Interruption Test Script for VoiceBook
Executes rapid consecutive user speech interruptions:
1. 'Find Pune to Delhi'
2. 'Actually Mumbai'
3. 'No, Pune'
4. 'Under 5000'
5. 'Wait, don't book'
Validates:
- Monotonic generation increase
- Only latest authoritative state survives
- Stale results discarded >= 1
- Stale results spoken == 0
Outputs results to evaluation/results/rapid_interruption_results.json.
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
from app.database.seed import seed_database
from app.services.metrics import metrics_collector


async def run_rapid_interruption_test():
    print("=" * 70)
    print("VOICEBOOK RAPID CONSECUTIVE INTERRUPTION TEST")
    print("=" * 70)

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
        session_id="eval-rapid-interruptions",
        on_event=on_event,
        on_audio_chunk=on_audio_chunk
    )
    manager.custom_search_delay = 0.15

    rapid_utterances = [
        "Find Pune to Delhi",
        "Actually Mumbai",
        "No, Pune",
        "Under 5000",
        "Wait, don't book"
    ]

    print("\nExecuting rapid utterance stream (sub-second bursts)...")
    tasks = []
    for idx, utt in enumerate(rapid_utterances, start=1):
        print(f"--> [t={idx*50}ms] Utterance: '{utt}'")
        tasks.append(asyncio.create_task(manager.process_user_utterance(utt)))
        await asyncio.sleep(0.05)

    await asyncio.gather(*tasks)

    print("\n" + "=" * 70)
    print("VERIFICATION OF RAPID INTERRUPTION CRITERIA")
    print("=" * 70)

    checks = {}

    # Criterion 1: Generation increased monotonically for each utterance
    final_gen = manager.generation_manager.current_generation
    checks["1_generation_increased"] = final_gen >= len(rapid_utterances)

    # Criterion 2: Origin stabilized to Pune
    checks["2_origin_is_pune"] = manager.constraints.origin == "Pune"

    # Criterion 3: Destination is Delhi
    checks["3_destination_is_delhi"] = manager.constraints.destination == "Delhi"

    # Criterion 4: Budget is 5000
    checks["4_budget_is_5000"] = manager.constraints.budget == 5000.0

    # Criterion 5: No booking confirmed
    checks["5_no_stale_booking"] = manager.constraints.selected_flight is None

    # Criterion 6: Stale results discarded > 0
    checks["6_stale_results_discarded"] = manager.generation_manager.stale_results_discarded >= 1

    # Criterion 7: Stale results spoken is strictly 0
    stale_spoken = [g for g, _, _ in spoken_chunks if g < final_gen]
    checks["7_stale_results_spoken_zero"] = len(stale_spoken) == 0 and metrics_collector.stale_results_spoken == 0

    all_passed = all(checks.values())

    for criterion, passed in checks.items():
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {criterion}")

    print("=" * 70)
    print(f"OVERALL RESULT: {'PASSED' if all_passed else 'FAILED'}")
    print("=" * 70)

    # Save empirical results to evaluation/results/
    os.makedirs(os.path.join(os.path.dirname(__file__), "results"), exist_ok=True)
    results_file = os.path.join(os.path.dirname(__file__), "results", "rapid_interruption_results.json")
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump({
            "test": "rapid_interruption_test",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "utterances_sent": rapid_utterances,
            "final_generation": final_gen,
            "stale_results_discarded": manager.generation_manager.stale_results_discarded,
            "stale_results_spoken": metrics_collector.stale_results_spoken,
            "checks": checks,
            "overall_passed": all_passed,
            "final_constraints": manager.constraints.model_dump()
        }, f, indent=2)

    print(f"Results saved to: {results_file}")
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(run_rapid_interruption_test())
    sys.exit(0 if success else 1)
