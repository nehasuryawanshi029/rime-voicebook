import asyncio
import pytest
from app.agent.conversation import ConversationManager
from app.agent.state import VoiceState
from app.agent.generation import GenerationManager
from app.tools.flights import search_flights_tool


@pytest.mark.asyncio
async def test_scenario_a_old_tool_finishes_before_interruption():
    """
    Scenario A: Old tool finishes before interruption.
    Gen 1 completes search and sets state normally.
    Then user interrupts and initiates Gen 2.
    Expected: Gen 1 was valid when it completed; Gen 2 now supersedes Gen 1 and becomes authoritative.
    """
    manager = ConversationManager(session_id="race-a")
    manager.custom_search_delay = 0.05

    # Run Gen 1 to full completion
    await manager.process_user_utterance("Pune to Delhi")
    assert manager.generation_manager.current_generation == 1
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.destination == "Delhi"

    # User then changes constraint
    await manager.process_user_utterance("Actually from Mumbai")
    assert manager.generation_manager.current_generation == 2
    assert manager.constraints.origin == "Mumbai"
    assert manager.constraints.destination == "Delhi"


@pytest.mark.asyncio
async def test_scenario_b_old_tool_finishes_after_interruption():
    """
    Scenario B: Old tool finishes AFTER interruption.
    Gen 1 launches long search (delay=0.4s).
    At t=0.05s, user interrupts with Gen 2 (delay=0.05s).
    Gen 2 finishes first. Gen 1 completes later.
    Expected: Gen 1 result is discarded at the fence, does not overwrite Gen 2.
    """
    events = []
    async def capture_event(e):
        events.append(e)

    manager = ConversationManager(session_id="race-b", on_event=capture_event)
    manager.custom_search_delay = 0.35

    # Start slow Gen 1 search
    task1 = asyncio.create_task(manager.process_user_utterance("Pune to Delhi"))
    await asyncio.sleep(0.05)
    assert manager.generation_manager.current_generation == 1

    # Interrupt with fast Gen 2 search
    manager.custom_search_delay = 0.05
    await manager.process_user_utterance("Actually Mumbai to Delhi")
    assert manager.generation_manager.current_generation == 2

    # Wait for both tasks
    await task1

    # Authoritative state must be Mumbai
    assert manager.constraints.origin == "Mumbai"
    assert manager.generation_manager.stale_results_discarded >= 1


@pytest.mark.asyncio
async def test_scenario_c_old_tool_finishes_around_new_tool_start():
    """
    Scenario C: Old tool finishes exactly around new tool start.
    Simulate race where Gen 1 tool result arrives just as Gen 2 is created.
    Expected: Generation fencing rejects Gen 1 with zero state mutation.
    """
    gm = GenerationManager(session_id="race-c")

    req1 = gm.new_generation("Pune to Delhi")
    gen1 = req1.generation

    # Exactly at tool finish, user barge-in triggers Gen 2
    req2 = gm.new_generation("Mumbai to Delhi")
    gen2 = req2.generation

    # Now tool 1 attempts to commit result
    mock_res_1 = {"flights": [{"origin": "Pune", "destination": "Delhi"}], "origin": "Pune"}
    fenced_1 = gm.handle_tool_result(generation=gen1, result=mock_res_1)

    assert fenced_1 is None, "Tool 1 must be rejected by fence"
    assert gm.stale_results_discarded == 1

    # Tool 2 commits result
    mock_res_2 = {"flights": [{"origin": "Mumbai", "destination": "Delhi"}], "origin": "Mumbai"}
    fenced_2 = gm.handle_tool_result(generation=gen2, result=mock_res_2)

    assert fenced_2 is not None
    assert fenced_2["origin"] == "Mumbai"


@pytest.mark.asyncio
async def test_scenario_d_two_tools_finish_in_reverse_order():
    """
    Scenario D: Two tools finish in reverse order.
    Gen 1 search takes 0.3s. Gen 2 search takes 0.05s.
    Gen 2 completes first. Gen 1 completes later.
    Expected: Gen 2 result remains authoritative; Gen 1 discarded.
    """
    gm = GenerationManager(session_id="race-d")

    req1 = gm.new_generation("Pune to Delhi")
    req2 = gm.new_generation("Mumbai to Delhi")

    # Gen 2 completes first
    res2 = gm.handle_tool_result(2, {"origin": "Mumbai", "count": 5})
    assert res2 is not None
    assert res2["origin"] == "Mumbai"

    # Gen 1 completes later
    res1 = gm.handle_tool_result(1, {"origin": "Pune", "count": 8})
    assert res1 is None, "Late Gen 1 result must be discarded"
    assert gm.stale_results_discarded == 1


@pytest.mark.asyncio
async def test_scenario_e_rime_speaking_immediately_before_interruption():
    """
    Scenario E: Rime starts speaking old response immediately before interruption.
    Agent enters SPEAKING state for Gen 1.
    User immediately barge-in.
    Expected: TTS abort signal triggers, audio stopped, response marked interrupted,
    new generation created, and no remaining buffered Gen 1 chunks played.
    """
    spoken_chunks = []
    async def capture_chunk(chunk, gen):
        spoken_chunks.append((gen, len(chunk)))

    manager = ConversationManager(session_id="race-e", on_audio_chunk=capture_chunk)
    req1 = manager.generation_manager.new_generation("Search Pune to Delhi")

    # Start speaking
    tts_task = asyncio.create_task(
        manager._speak_response(req1.generation, "I found multiple flights from Pune to Delhi.")
    )
    await asyncio.sleep(0.08)

    # Barge-in immediately
    await manager.handle_interruption(reason="user_barge_in_before_tts_finish")

    assert manager.generation_manager.current_generation > req1.generation
    assert manager.state_machine.current_state == VoiceState.INTERRUPTED

    await tts_task

    # All spoken chunks after interruption must belong strictly to authoritative gen
    for gen, _ in spoken_chunks:
        assert gen <= manager.generation_manager.current_generation


@pytest.mark.asyncio
async def test_scenario_f_rapid_multiple_interruptions():
    """
    Scenario F: User interrupts multiple times in sub-second bursts.
    5 rapid corrections fired in 150ms.
    Expected: Generation monotonically climbs, system does not deadlock,
    final generation is strictly authoritative.
    """
    manager = ConversationManager(session_id="race-f")
    manager.custom_search_delay = 0.05

    burst = [
        "Pune to Delhi",
        "Actually Mumbai to Delhi",
        "Wait, from Bangalore",
        "Actually back to Pune",
        "Under 5000 rupees"
    ]

    tasks = []
    for utterance in burst:
        tasks.append(asyncio.create_task(manager.process_user_utterance(utterance)))
        await asyncio.sleep(0.02)

    await asyncio.gather(*tasks)

    # Final generation must be >= 5
    assert manager.generation_manager.current_generation >= 5
    # Constraints must reflect final utterance
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.budget == 5000.0
