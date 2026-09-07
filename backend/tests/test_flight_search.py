import pytest
from app.tools.flights import search_flights_tool
from app.database.database import query_flights


@pytest.mark.asyncio
async def test_normal_flight_search():
    """
    Test 1: Normal flight search from Pune to Delhi.
    Verifies flights are retrieved with correct origin, destination, prices and airlines.
    """
    results = await search_flights_tool(
        origin="Pune",
        destination="Delhi",
        generation=1,
        delay_seconds=0.05
    )

    assert results["generation"] == 1
    assert results["count"] > 0
    assert len(results["flights"]) > 0

    first = results["flights"][0]
    assert first["origin"].lower() == "pune"
    assert first["destination"].lower() == "delhi"
    assert "price" in first
    assert "flight_number" in first
    assert "airline" in first
