import pytest
import asyncio
from app.agent.conversation import ConversationManager
from app.database.database import get_db_connection

@pytest.mark.asyncio
async def test_budget_increase_finds_flights():
    """
    Regression test to ensure increasing a budget in a subsequent generation
    correctly triggers a new search and successfully surfaces flights if they exist,
    preventing stale state or incorrect 'no flights' speech.
    """
    session = ConversationManager("regression-budget")
    
    # Fast search for tests
    session.custom_search_delay = 0.0

    # Gen N: Restrictive budget where no flights exist
    await session.process_user_utterance("Find me a flight from Mumbai to Delhi tomorrow under 1000 rupees")
    
    # Wait for the search task to finish
    await asyncio.sleep(0.5)
    
    assert session.constraints.origin == "Mumbai"
    assert session.constraints.destination == "Delhi"
    assert session.constraints.budget == 1000.0
    assert session.constraints.date == "tomorrow"
    
    # At this budget, there should be no flights found
    assert len(session.current_flights) == 0
    
    # Gen N+1: Increase budget
    await session.process_user_utterance("Actually, make the budget 10000 rupees")
    
    # Wait for the search task to finish
    await asyncio.sleep(0.5)
    
    assert session.constraints.budget == 10000.0
    # The tool should have been called again and found flights
    assert len(session.current_flights) > 0
    assert session.current_flights[0]["price"] <= 10000.0
    
    print(f"\nGen N+1 Tool Output: Found {len(session.current_flights)} flights.")
    print(f"Top Flight: {session.current_flights[0]}")
