import sqlite3
import os
import hashlib
import secrets
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.config import settings


def hash_password(password: str, salt: Optional[str] = None) -> tuple:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt


def verify_password(password: str, hashed: str, salt: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(new_hash, hashed)


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
            user_id TEXT,
            FOREIGN KEY (flight_id) REFERENCES flights (id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            salt TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # Ensure user_id column exists if table existed previously without it
    cursor.execute("PRAGMA table_info(bookings)")
    cols = [c[1] for c in cursor.fetchall()]
    if "user_id" not in cols:
        try:
            cursor.execute("ALTER TABLE bookings ADD COLUMN user_id TEXT")
        except Exception:
            pass

    conn.commit()
    conn.close()

    seed_default_users()


def seed_default_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        default_users = [
            ("usr-demo-001", "demo", "demo@voicebook.ai", "Password123!", "Demo User"),
            ("usr-pilot-002", "pilot", "pilot@voicebook.ai", "FlightPilot2024!", "Captain Alex"),
            ("usr-vedant-003", "vedant", "vedant@voicebook.ai", "VoiceBook2024!", "Vedant"),
        ]
        now = datetime.now(timezone.utc).isoformat()
        for uid, uname, email, pwd, name in default_users:
            h, s = hash_password(pwd)
            cursor.execute("""
                INSERT INTO users (id, username, email, hashed_password, salt, name, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (uid, uname, email.lower(), h, s, name, now))
        conn.commit()
    conn.close()


def get_user_by_username_or_email(identifier: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cleaned = identifier.strip().lower()
    cursor.execute("""
        SELECT * FROM users
        WHERE LOWER(username) = ? OR LOWER(email) = ?
    """, (cleaned, cleaned))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(username: str, email: str, password: str, name: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    user_id = f"usr-{uuid.uuid4().hex[:8]}"
    h, s = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO users (id, username, email, hashed_password, salt, name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, username.strip(), email.strip().lower(), h, s, name.strip(), now))
    conn.commit()
    conn.close()
    return {
        "id": user_id,
        "username": username,
        "email": email,
        "name": name,
        "created_at": now
    }


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

    if date:
        date_str = date.strip().lower()
        if date_str == "today":
            date_str = datetime.now(timezone.utc).date().isoformat()
        elif date_str == "tomorrow":
            import datetime as dt
            date_str = (datetime.now(timezone.utc).date() + dt.timedelta(days=1)).isoformat()
        query += " AND date = ?"
        params.append(date_str)

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
    total_price: float = 0.0,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO bookings (booking_id, flight_id, passenger_name, passengers_count, total_price, status, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
    """, (booking_id, flight_id, passenger_name, passengers_count, total_price, now, user_id))

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
        "created_at": now,
        "user_id": user_id
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


def get_all_bookings(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("""
            SELECT b.*, f.airline, f.flight_number, f.origin, f.destination, f.date, f.departure_time, f.arrival_time, f.duration, f.price
            FROM bookings b
            LEFT JOIN flights f ON b.flight_id = f.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        """, (user_id,))
    else:
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

