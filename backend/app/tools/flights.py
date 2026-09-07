import asyncio
import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.config import settings
from app.database.database import query_flights

logger = logging.getLogger("voicebook.tools.flights")


async def search_flights_tool(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    date: Optional[str] = None,
    budget: Optional[float] = None,
    passengers: int = 1,
    generation: int = 1,
    delay_seconds: Optional[float] = None
) -> Dict[str, Any]:
    """
    Search flights with artificial delay to simulate external flight GDS latency.
    Allows user interruption during the search delay.
    """
    delay = delay_seconds if delay_seconds is not None else settings.FLIGHT_SEARCH_DELAY_SECONDS
    logger.info(
        f"[Gen {generation}] search_flights tool started: origin={origin}, destination={destination}, budget={budget} (delay={delay}s)"
    )

    start_time = time.time()

    # Simulate network latency in small cancellation-friendly chunks
    if delay > 0:
        chunk = 0.1
        elapsed = 0.0
        while elapsed < delay:
            await asyncio.sleep(min(chunk, delay - elapsed))
            elapsed += chunk

    duration_ms = (time.time() - start_time) * 1000

    results = query_flights(
        origin=origin,
        destination=destination,
        date=date,
        max_price=budget,
        passengers=passengers
    )

    logger.info(
        f"[Gen {generation}] search_flights tool completed: found {len(results)} flights in {duration_ms:.1f}ms"
    )

    return {
        "generation": generation,
        "origin": origin,
        "destination": destination,
        "date": date,
        "budget": budget,
        "passengers": passengers,
        "flights": results,
        "count": len(results),
        "duration_ms": duration_ms
    }
