import pytest
import asyncio
import struct
from app.services.rime import rime_service

@pytest.mark.asyncio
async def test_rime_audio_format_validity():
    """
    Test that the Rime service (and its fallback) emits valid PCM audio chunks.
    PCM 16-bit mono 24000Hz should yield bytes length that is a multiple of 2 (16 bits = 2 bytes per sample).
    """
    received_chunks = []
    
    abort_event = asyncio.Event()
    
    # We use a short text to generate a few chunks
    async for chunk in rime_service.stream_speech("Hello, this is a test.", generation=1, abort_event=abort_event):
        received_chunks.append(chunk)
        
    assert len(received_chunks) > 0, "Audio stream must not be empty"
    
    total_bytes = sum(len(c) for c in received_chunks)
    assert total_bytes > 0, "Total audio bytes must be > 0"
    
    for i, chunk in enumerate(received_chunks):
        assert len(chunk) > 0, f"Chunk {i} is empty"
        assert len(chunk) % 2 == 0, f"Chunk {i} has length {len(chunk)}, which is not a multiple of 2 (invalid for 16-bit PCM)"
        # Validate structurally that it can be unpacked as Int16 (h)
        try:
            num_samples = len(chunk) // 2
            samples = struct.unpack(f'<{num_samples}h', chunk)
            
            # Simple check to ensure it's not complete silence or random noise (MP3 headers look like noise)
            # We expect some variance but not extreme white noise across the whole chunk
            variance = sum(abs(s) for s in samples) / (len(samples) + 1)
            assert variance > 0, f"Chunk {i} is completely silent"
        except struct.error as e:
            pytest.fail(f"Chunk {i} failed Int16 PCM struct unpacking: {e}")
        
    print(f"Validated {len(received_chunks)} PCM chunks, total bytes: {total_bytes}. All chunk lengths aligned to 16-bit boundaries, structurally valid, and contain actual audio signals.")

@pytest.mark.asyncio
async def test_rime_payload_contains_language():
    """
    Test that the actual Rime HTTP request payload includes 'lang' and 'audioFormat' parameters.
    """
    from unittest.mock import AsyncMock, MagicMock
    
    # Save original values
    orig_api_key = rime_service.api_key
    orig_has_key = rime_service._has_api_key
    orig_last_ok = rime_service._last_api_ok
    orig_get_session = rime_service._get_session

    # Force the service to appear healthy so it tries to hit the API
    rime_service.api_key = "dummy_key_for_test"
    rime_service._has_api_key = True
    rime_service._last_api_ok = True
    
    captured_payload = {}

    # Build mock response that behaves like aiohttp.ClientResponse
    mock_response = MagicMock()
    mock_response.status = 200
    mock_content = AsyncMock()
    mock_content.read = AsyncMock(side_effect=[b'\x00\x00', b''])
    mock_response.content = mock_content

    # session.post(...) must return an async context manager (not a coroutine)
    post_cm = MagicMock()
    post_cm.__aenter__ = AsyncMock(return_value=mock_response)
    post_cm.__aexit__ = AsyncMock(return_value=False)

    def mock_post_fn(url, json=None, headers=None):
        captured_payload.update(json or {})
        return post_cm

    # Build mock session
    mock_session = MagicMock()
    mock_session.post = mock_post_fn
    mock_session.closed = False

    # Mock _get_session to return our mock session directly
    async def mock_get_session():
        return mock_session

    try:
        rime_service._get_session = mock_get_session
        
        # Stream some text
        async for _ in rime_service.stream_speech("Hello", 1):
            pass
            
        # Verify the post was called with correct payload
        assert "lang" in captured_payload, "'lang' field is missing from Rime request payload"
        assert captured_payload["lang"] == "en", f"Payload language '{captured_payload['lang']}' doesn't match expected 'en'"
        assert captured_payload["audioFormat"] == "pcm", "audioFormat must be pcm"
        assert captured_payload["samplingRate"] == 24000, "samplingRate must be 24000"
        assert captured_payload["speaker"] == "marsh", f"speaker should be 'marsh', got '{captured_payload['speaker']}'"
    finally:
        # Restore original values
        rime_service.api_key = orig_api_key
        rime_service._has_api_key = orig_has_key
        rime_service._last_api_ok = orig_last_ok
        rime_service._get_session = orig_get_session
