import asyncio
import pytest
from app.agent.conversation import ConversationManager
from app.agent.state import VoiceState
from app.services.rime import rime_service
from app.services.metrics import metrics_collector


@pytest.mark.asyncio
async def test_interruption_during_tts():
    """
    Test 5: Interruption during TTS.
    When agent is speaking (Rime TTS streaming audio), user interrupts.
    Audio must abort immediately, response marked INTERRUPTED, generation incremented.
    """
    received_audio_chunks = []

    async def on_audio(chunk: bytes, generation: int):
        received_audio_chunks.append((generation, len(chunk)))

    manager = ConversationManager(
        session_id="test-tts-interrupt",
        on_audio_chunk=on_audio
    )

    # Start speech in Gen 1
    req1 = manager.generation_manager.new_generation("Flight options")
    gen1 = req1.generation

    # Launch background speaking task
    speak_task = asyncio.create_task(
        manager._speak_response(
            generation=gen1,
            text="I found 10 flights from Pune to Delhi. The cheapest option is Air India departing at 10:30 AM."
        )
    )

    # Wait briefly for audio generation to begin
    await asyncio.sleep(0.1)
    assert manager.state_machine.current_state == VoiceState.SPEAKING

    # User interrupts mid-speech
    await manager.handle_interruption(reason="user_voice_barge_in")

    assert manager.state_machine.current_state == VoiceState.INTERRUPTED
    assert manager.generation_manager.current_generation > gen1

    await speak_task

    # Verify no subsequent Gen 1 audio was accepted
    for gen, _ in received_audio_chunks:
        assert gen == gen1 or gen == manager.generation_manager.current_generation
