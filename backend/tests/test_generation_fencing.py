import asyncio
import pytest
from app.agent.conversation import ConversationManager
from app.agent.generation import GenerationManager
from app.tools.flights import search_flights_tool


@pytest.mark.asyncio
async def test_interruption_during_flight_search():
    """
    Test 4: Interruption during flight search.
    User asks for Pune to Delhi.
    While the 0.5s simulated tool delay is running, user interrupts: 'Actually from Mumbai'.
    System must increment generation, cancel old search, and execute Gen 2.
    """
    events = []

    async def event_collector(event):
        events.append(event)

    manager = ConversationManager(session_id="test-fence", on_event=event_collector)

    # Launch search with slight delay to allow mid-flight interruption
    task1 = asyncio.create_task(manager.process_user_utterance("Find flights from Pune to Delhi tomorrow."))
    await asyncio.sleep(0.05)

    gen1 = manager.generation_manager.current_generation
    assert gen1 >= 1

    # User interrupts mid-search
    await manager.process_user_utterance("Actually from Mumbai.")
    gen2 = manager.generation_manager.current_generation

    assert gen2 > gen1, "Generation must increment on interruption"
    assert manager.constraints.origin == "Mumbai", "New authoritative origin must be Mumbai"
    assert manager.constraints.destination == "Delhi", "Destination Delhi preserved"

    await task1  # Wait for any lingering tasks to clean up


@pytest.mark.asyncio
async def test_stale_generation_rejection():
    """
    Test 6: Stale generation rejection.
    Simulate Gen 1 returning late.
    Assert result.generation != current_generation discards result and increments stale_results_discarded.
    """
    gm = GenerationManager(session_id="test-stale")

    req1 = gm.new_generation("Pune to Delhi")
    assert req1.generation == 1

    # User interrupts, bumping to Gen 2
    req2 = gm.new_generation("Mumbai to Delhi")
    assert req2.generation == 2

    # Gen 1 finishes late
    mock_gen1_result = {
        "flights": [{"flight_number": "6E-204", "origin": "Pune", "destination": "Delhi"}],
        "origin": "Pune"
    }

    # Pass Gen 1 result through fence
    fenced_result = gm.handle_tool_result(generation=1, result=mock_gen1_result)

    assert fenced_result is None, "Stale result from Gen 1 must be discarded by fence!"
    assert gm.stale_results_discarded == 1, "stale_results_discarded metric must increment"
    assert gm.stale_results_spoken == 0, "stale_results_spoken must be strictly 0"

    # Pass Gen 2 result
    mock_gen2_result = {
        "flights": [{"flight_number": "6E-501", "origin": "Mumbai", "destination": "Delhi"}],
        "origin": "Mumbai"
    }
    fenced_gen2 = gm.handle_tool_result(generation=2, result=mock_gen2_result)
    assert fenced_gen2 is not None, "Current generation result must be accepted!"
    assert fenced_gen2["origin"] == "Mumbai"
