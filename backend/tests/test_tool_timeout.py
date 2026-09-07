import asyncio
import time
import pytest
from app.tools.flights import search_flights_tool


@pytest.mark.asyncio
async def test_tool_delay_and_timeout():
    """
    Test 9: Tool timeout and simulated delay.
    Verifies that the search tool respects delay_seconds and can be aborted via timeout.
    """
    start_time = time.time()

    # Search with 0.2s delay
    res = await search_flights_tool(
        origin="Mumbai",
        destination="Delhi",
        generation=1,
        delay_seconds=0.2
    )

    elapsed = time.time() - start_time
    assert elapsed >= 0.18, f"Tool should have delayed for ~0.2s, took {elapsed}s"
    assert res["count"] > 0

    # Test timeout with asyncio.wait_for
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(
            search_flights_tool(
                origin="Mumbai",
                destination="Delhi",
                generation=2,
                delay_seconds=2.0
            ),
            timeout=0.1
        )
