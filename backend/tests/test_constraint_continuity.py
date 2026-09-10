import pytest
from app.agent.state import BookingConstraints
from app.agent.conversation import ConversationManager


@pytest.mark.asyncio
async def test_budget_update_preserves_constraints():
    """
    Test 2: Budget update.
    User specifies Pune to Delhi, then says 'Under 5000'.
    State must preserve origin=Pune, destination=Delhi, and set budget=5000.
    """
    manager = ConversationManager(session_id="test-budget")

    await manager.process_user_utterance("Find me a flight from Pune to Delhi tomorrow.")
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.destination == "Delhi"

    await manager.process_user_utterance("Under five thousand rupees.")
    assert manager.constraints.origin == "Pune", "Origin must be preserved!"
    assert manager.constraints.destination == "Delhi", "Destination must be preserved!"
    assert manager.constraints.budget == 5000.0, "Budget must be updated to 5000!"


@pytest.mark.asyncio
async def test_destination_update_preserves_constraints():
    """
    Test 3: Origin/Destination update.
    User changes origin from Pune to Mumbai ('Actually, from Mumbai').
    State must update origin to Mumbai while preserving destination=Delhi and budget=5000.
    """
    manager = ConversationManager(session_id="test-dest")
    manager.constraints.origin = "Pune"
    manager.constraints.destination = "Delhi"
    manager.constraints.budget = 5000.0

    await manager.process_user_utterance("Actually from Mumbai.")
    assert manager.constraints.origin == "Mumbai", "Origin should update to Mumbai"
    assert manager.constraints.destination == "Delhi", "Destination should remain Delhi"
    assert manager.constraints.budget == 5000.0, "Budget should remain 5000"


@pytest.mark.asyncio
async def test_multiple_constraint_changes():
    """
    Test 8: Multiple constraint changes in sequence.
    Pune -> Bangalore -> under 4000 -> actually to Delhi -> under 4500.
    """
    manager = ConversationManager(session_id="test-multi")

    await manager.process_user_utterance("Pune to Bangalore")
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.destination == "Bangalore"

    await manager.process_user_utterance("Under 4000")
    assert manager.constraints.budget == 4000.0
    assert manager.constraints.destination == "Bangalore"

    await manager.process_user_utterance("Actually to Delhi")
    assert manager.constraints.destination == "Delhi"
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.budget == 4000.0


@pytest.mark.asyncio
async def test_budget_formats():
    """
    Test varied budget utterance formats including '5k' and 'budget is 7000'.
    """
    manager = ConversationManager(session_id="test-budget-formats")
    
    await manager.process_user_utterance("Pune to Mumbai under 5k")
    assert manager.constraints.budget == 5000.0

    await manager.process_user_utterance("budget is 7000")
    assert manager.constraints.budget == 7000.0

    await manager.process_user_utterance("keep it under 10000")
    assert manager.constraints.budget == 10000.0
