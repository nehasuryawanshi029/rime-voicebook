import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.config import settings


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS flights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            flight_number TEXT NOT NULL,
            airline TEXT NOT NULL,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            date TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            arrival_time TEXT NOT NULL,
            duration TEXT NOT NULL,
            price REAL NOT NULL,
            stops INTEGER NOT NULL DEFAULT 0,
            seats_available INTEGER NOT NULL DEFAULT 10
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            booking_id TEXT PRIMARY KEY,
            flight_id INTEGER NOT NULL,
            passenger_name TEXT NOT NULL,
            passengers_count INTEGER NOT NULL DEFAULT 1,
            total_price REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'CONFIRMED',
            created_at TEXT NOT NULL,
            FOREIGN KEY (flight_id) REFERENCES flights (id)
        )
    """)

    conn.commit()
    conn.close()


def query_flights(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    date: Optional[str] = None,
    max_price: Optional[float] = None,
    passengers: int = 1
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM flights WHERE seats_available >= ?"
    params: List[Any] = [passengers]

    if origin:
        query += " AND LOWER(origin) = LOWER(?)"
        params.append(origin.strip())

    if destination:
        query += " AND LOWER(destination) = LOWER(?)"
        params.append(destination.strip())

    if max_price is not None and max_price > 0:
        query += " AND price <= ?"
        params.append(float(max_price))

    query += " ORDER BY price ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results


def get_flight_by_id(flight_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM flights WHERE id = ?", (flight_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_booking_record(
    booking_id: str,
    flight_id: int,
    passenger_name: str = "Voice User",
    passengers_count: int = 1,
    total_price: float = 0.0
) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO bookings (booking_id, flight_id, passenger_name, passengers_count, total_price, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?)
    """, (booking_id, flight_id, passenger_name, passengers_count, total_price, now))

    # Decrement available seats
    cursor.execute("UPDATE flights SET seats_available = seats_available - ? WHERE id = ?", (passengers_count, flight_id))

    conn.commit()
    conn.close()

    return {
        "booking_id": booking_id,
        "flight_id": flight_id,
        "passenger_name": passenger_name,
        "passengers_count": passengers_count,
        "total_price": total_price,
        "status": "CONFIRMED",
        "created_at": now
    }


def cancel_booking_record(booking_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT flight_id, passengers_count, status FROM bookings WHERE booking_id = ?", (booking_id,))
    row = cursor.fetchone()
    if not row or row["status"] == "CANCELLED":
        conn.close()
        return False

    flight_id = row["flight_id"]
    passengers_count = row["passengers_count"]

    cursor.execute("UPDATE bookings SET status = 'CANCELLED' WHERE booking_id = ?", (booking_id,))
    cursor.execute("UPDATE flights SET seats_available = seats_available + ? WHERE id = ?", (passengers_count, flight_id))
    conn.commit()
    conn.close()
    return True


def get_all_bookings() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT b.*, f.airline, f.flight_number, f.origin, f.destination, f.date, f.departure_time, f.arrival_time, f.duration, f.price
        FROM bookings b
        LEFT JOIN flights f ON b.flight_id = f.id
        ORDER BY b.created_at DESC
    """)
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results


def get_booking_by_id(booking_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT b.*, f.airline, f.flight_number, f.origin, f.destination, f.date, f.departure_time, f.arrival_time, f.duration, f.price
        FROM bookings b
        LEFT JOIN flights f ON b.flight_id = f.id
        WHERE b.booking_id = ?
    """, (booking_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

