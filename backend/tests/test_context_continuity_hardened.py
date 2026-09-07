import pytest
from app.agent.conversation import ConversationManager


@pytest.mark.asyncio
async def test_full_context_continuity_with_passengers():
    """
    Test 7: Hardened Context Continuity.
    User specifies:
    1. 'Find Pune to Delhi tomorrow.'
    2. 'Under 5000.'
    3. '2 passengers.'
    4. 'Actually from Mumbai.'
    Final state must strictly be:
    origin = 'Mumbai'
    destination = 'Delhi'
    date = 'tomorrow'
    budget = 5000.0
    passengers = 2
    """
    manager = ConversationManager(session_id="test-continuity-hardened")
    manager.custom_search_delay = 0.01

    # Turn 1
    await manager.process_user_utterance("Find Pune to Delhi tomorrow.")
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.destination == "Delhi"
    assert manager.constraints.date == "tomorrow"

    # Turn 2
    await manager.process_user_utterance("Under 5000.")
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.destination == "Delhi"
    assert manager.constraints.date == "tomorrow"
    assert manager.constraints.budget == 5000.0

    # Turn 3
    await manager.process_user_utterance("2 passengers.")
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.destination == "Delhi"
    assert manager.constraints.date == "tomorrow"
    assert manager.constraints.budget == 5000.0
    assert manager.constraints.passengers == 2

    # Turn 4
    await manager.process_user_utterance("Actually from Mumbai.")
    assert manager.constraints.origin == "Mumbai", "Origin must update to Mumbai"
    assert manager.constraints.destination == "Delhi", "Destination must remain Delhi"
    assert manager.constraints.date == "tomorrow", "Date must remain tomorrow"
    assert manager.constraints.budget == 5000.0, "Budget must remain 5000"
    assert manager.constraints.passengers == 2, "Passenger count must remain 2"
