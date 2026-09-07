import uuid
import logging
from typing import Dict, Any, Optional
from app.database.database import get_flight_by_id, create_booking_record, cancel_booking_record

logger = logging.getLogger("voicebook.tools.booking")


def select_flight_tool(flight_id: int) -> Dict[str, Any]:
    flight = get_flight_by_id(flight_id)
    if not flight:
        return {"success": False, "error": f"Flight with ID {flight_id} not found"}
    return {
        "success": True,
        "flight": flight,
        "message": f"Selected flight {flight['flight_number']} ({flight['airline']}) from {flight['origin']} to {flight['destination']} for ₹{flight['price']}."
    }


def confirm_booking_tool(flight_id: int, passenger_name: str = "Voice User", passengers_count: int = 1) -> Dict[str, Any]:
    flight = get_flight_by_id(flight_id)
    if not flight:
        return {"success": False, "error": f"Flight {flight_id} not found"}

    if flight["seats_available"] < passengers_count:
        return {"success": False, "error": "Insufficient seats available"}

    booking_id = f"VBK-{uuid.uuid4().hex[:8].upper()}"
    total_price = flight["price"] * passengers_count

    booking = create_booking_record(
        booking_id=booking_id,
        flight_id=flight_id,
        passenger_name=passenger_name,
        passengers_count=passengers_count,
        total_price=total_price
    )

    logger.info(f"Booking confirmed: {booking_id} for flight {flight['flight_number']}")
    return {
        "success": True,
        "booking": booking,
        "flight": flight,
        "message": f"Booking confirmed! Booking ID: {booking_id}. Total: ₹{total_price}."
    }


def cancel_booking_tool(booking_id: str) -> Dict[str, Any]:
    success = cancel_booking_record(booking_id)
    if not success:
        return {"success": False, "error": f"Booking {booking_id} not found or already cancelled"}
    return {"success": True, "booking_id": booking_id, "message": f"Booking {booking_id} cancelled successfully"}
