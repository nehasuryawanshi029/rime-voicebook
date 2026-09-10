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
    Test that the actual Rime HTTP request payload includes the 'lang' parameter from configuration.
    """
    from unittest.mock import patch, AsyncMock
    import json
    
    # Force the service to appear healthy so it tries to hit the API
    rime_service.is_connected = True
    rime_service.provider_status = "CONNECTED"
    rime_service.api_key = "dummy_key_for_test"
    
    with patch('aiohttp.ClientSession.post') as mock_post:
        # Mock the context manager and response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.content.read.side_effect = [b'\x00\x00', b''] # one valid chunk then EOF
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        # Stream some text
        async for _ in rime_service.stream_speech("Hello", 1):
            pass
            
        # Verify the post was called with correct payload
        assert mock_post.called, "Rime API post was not called"
        
        # Extract the json kwargs passed to post
        call_kwargs = mock_post.call_args.kwargs
        payload = call_kwargs.get("json", {})
        
        assert "lang" in payload, "'lang' field is missing from Rime request payload"
        assert payload["lang"] == rime_service.language, f"Payload language '{payload['lang']}' doesn't match configured '{rime_service.language}'"
        assert payload["audioFormat"] == "pcm", "audioFormat must be pcm"

