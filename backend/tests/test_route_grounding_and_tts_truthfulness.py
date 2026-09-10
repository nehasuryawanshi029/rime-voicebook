import pytest

from app.agent.conversation import ConversationManager
from app.services.gemini import gemini_service
from app.services.rime import rime_service


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("utterance", "language"),
    [
        ("book flight from Pune to Mumbai", "en"),
        ("पुणे से मुंबई की फ्लाइट बुक करनी है", "hi"),
        ("मला पुणे ते मुंबई फ्लाइट बुक करायची आहे", "mr"),
    ],
)
async def test_explicit_routes_are_grounded_and_searched(utterance, language):
    """A complete route is searched, never clarified or reversed."""
    events = []

    async def capture(event):
        events.append(event)

    manager = ConversationManager("grounded-" + language, on_event=capture)
    manager.custom_search_delay = 0
    original_client = gemini_service.client
    gemini_service.client = None
    try:
        await manager.process_user_utterance(utterance)
    finally:
        gemini_service.client = original_client

    assert (manager.constraints.origin, manager.constraints.destination) == ("Pune", "Mumbai")
    assert any(event["type"] == "flights_found" for event in events), "A complete route must execute a flight search"
    state_events = [event for event in events if event["type"] == "state_updated"]
    assert state_events[-1]["data"]["language"] == language


def test_gemini_route_guardrail_overrides_reversed_json():
    parsed = {"action": "clarify", "constraints": {"origin": "Mumbai", "destination": "Pune"}}
    grounded = gemini_service._ground_llm_response(parsed, "book flight from Pune to Mumbai", {})
    assert grounded["action"] == "search"
    assert grounded["constraints"] == {"origin": "Pune", "destination": "Mumbai"}


@pytest.mark.asyncio
async def test_repeated_complete_route_remains_searchable_without_clarification():
    events = []

    async def capture(event):
        events.append(event)

    manager = ConversationManager("repeated-complete-route", on_event=capture)
    manager.custom_search_delay = 0
    original_client = gemini_service.client
    gemini_service.client = None
    try:
        await manager.process_user_utterance("book flight from Pune to Mumbai")
        await manager.process_user_utterance("book flight from Pune to Mumbai")
    finally:
        gemini_service.client = original_client

    assert manager.generation_manager.current_generation == 2
    assert (manager.constraints.origin, manager.constraints.destination) == ("Pune", "Mumbai")
    analyses = [event["data"]["llm_analysis"] for event in events if event["type"] == "state_updated"]
    assert [analysis["action"] for analysis in analyses] == ["search", "search"]


@pytest.mark.asyncio
async def test_fallback_is_announced_as_fallback_not_rime():
    events = []

    async def capture(event):
        events.append(event)

    manager = ConversationManager("tts-provider-truth", on_event=capture)
    request = manager.generation_manager.new_generation("tts")
    original_has_key = rime_service._has_api_key
    rime_service._has_api_key = False
    try:
        await manager._speak_response(request.generation, "A short response.")
    finally:
        rime_service._has_api_key = original_has_key
    starts = [event for event in events if event["type"] == "agent_speech_start"]
    assert starts
    assert starts[-1]["data"]["tts_provider"] != "rime"
