import pytest
from app.tools.flights import search_flights_tool
from app.tools.booking import select_flight_tool, confirm_booking_tool, cancel_booking_tool
from app.database.database import get_flight_by_id


@pytest.mark.asyncio
async def test_booking_confirmation_and_cancellation():
    """
    Test 10: Booking confirmation and cancellation flow.
    Verifies flight selection, booking creation, seat decrement, and cancellation restoration.
    """
    # 1. Search flight
    res = await search_flights_tool(origin="Pune", destination="Delhi", delay_seconds=0.01)
    assert res["count"] > 0
    flight = res["flights"][0]
    flight_id = flight["id"]
    initial_seats = flight["seats_available"]

    # 2. Select flight
    sel = select_flight_tool(flight_id)
    assert sel["success"] is True
    assert sel["flight"]["flight_number"] == flight["flight_number"]

    # 3. Confirm booking
    booking_res = confirm_booking_tool(
        flight_id=flight_id,
        passenger_name="Hackathon Judge",
        passengers_count=2
    )
    assert booking_res["success"] is True
    booking_id = booking_res["booking"]["booking_id"]
    assert booking_id.startswith("VBK-")

    # Verify seats decremented
    updated_flight = get_flight_by_id(flight_id)
    assert updated_flight["seats_available"] == initial_seats - 2

    # 4. Cancel booking
    cancel_res = cancel_booking_tool(booking_id)
    assert cancel_res["success"] is True

    # Verify seats restored
    restored_flight = get_flight_by_id(flight_id)
    assert restored_flight["seats_available"] == initial_seats
