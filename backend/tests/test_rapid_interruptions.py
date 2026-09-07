import asyncio
import pytest
from app.agent.conversation import ConversationManager


@pytest.mark.asyncio
async def test_rapid_consecutive_interruptions():
    """
    Test 7: Rapid consecutive interruptions.
    User sends 5 rapid corrections within 100ms.
    System must handle every interruption, increment generation monotonically,
    not deadlock, and stabilize on the final generation.
    """
    manager = ConversationManager(session_id="test-rapid")

    utterances = [
        "Pune to Delhi",
        "Actually Mumbai to Delhi",
        "Wait, from Bangalore",
        "Actually back to Pune",
        "Under 4500"
    ]

    tasks = []
    for utt in utterances:
        tasks.append(asyncio.create_task(manager.process_user_utterance(utt)))
        await asyncio.sleep(0.02)  # Rapid 20ms burst

    await asyncio.gather(*tasks)

    # Verify generation count reached at least 5
    assert manager.generation_manager.current_generation >= 5
    # Verify final constraints reflect the final utterance stream
    assert manager.constraints.origin == "Pune"
    assert manager.constraints.budget == 4500.0
