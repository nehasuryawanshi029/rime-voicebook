from datetime import datetime, timedelta
from app.database.database import get_db_connection, init_db

AIRLINES = ["IndiGo", "Air India", "Vistara", "Akasa Air", "SpiceJet"]

CITIES = ["Pune", "Mumbai", "Delhi", "Bangalore"]

ROUTES = [
    ("Pune", "Delhi", "06:15", "08:30", "2h 15m", 4850, 0, "6E-204", "IndiGo"),
    ("Pune", "Delhi", "10:30", "12:45", "2h 15m", 4299, 0, "AI-805", "Air India"),
    ("Pune", "Delhi", "15:00", "17:10", "2h 10m", 5400, 0, "UK-992", "Vistara"),
    ("Pune", "Delhi", "19:40", "21:55", "2h 15m", 3999, 0, "QP-1302", "Akasa Air"),
    ("Pune", "Delhi", "08:00", "12:15", "4h 15m", 3499, 1, "SG-819", "SpiceJet"),
    
    ("Mumbai", "Delhi", "07:00", "09:10", "2h 10m", 4499, 0, "6E-501", "IndiGo"),
    ("Mumbai", "Delhi", "11:15", "13:25", "2h 10m", 5100, 0, "AI-664", "Air India"),
    ("Mumbai", "Delhi", "16:45", "18:55", "2h 10m", 5800, 0, "UK-944", "Vistara"),
    ("Mumbai", "Delhi", "21:30", "23:40", "2h 10m", 3799, 0, "QP-1108", "Akasa Air"),
    ("Mumbai", "Delhi", "13:00", "17:45", "4h 45m", 3299, 1, "SG-152", "SpiceJet"),

    # The core demo route must be present in the searchable inventory.
    ("Pune", "Mumbai", "07:10", "08:20", "1h 10m", 2950, 0, "6E-317", "IndiGo"),
    ("Pune", "Mumbai", "11:45", "12:55", "1h 10m", 3250, 0, "AI-638", "Air India"),
    ("Pune", "Mumbai", "16:30", "17:40", "1h 10m", 2799, 0, "QP-118", "Akasa Air"),
    ("Pune", "Mumbai", "20:15", "21:25", "1h 10m", 3100, 0, "UK-904", "Vistara"),

    ("Pune", "Bangalore", "06:40", "08:05", "1h 25m", 3800, 0, "6E-451", "IndiGo"),
    ("Pune", "Bangalore", "14:20", "15:50", "1h 30m", 4200, 0, "AI-512", "Air India"),
    ("Pune", "Bangalore", "18:10", "19:35", "1h 25m", 4700, 0, "UK-823", "Vistara"),
    ("Pune", "Bangalore", "22:00", "23:25", "1h 25m", 3399, 0, "QP-1450", "Akasa Air"),

    ("Mumbai", "Bangalore", "08:15", "10:00", "1h 45m", 4100, 0, "6E-712", "IndiGo"),
    ("Mumbai", "Bangalore", "12:30", "14:15", "1h 45m", 4600, 0, "AI-639", "Air India"),
    ("Mumbai", "Bangalore", "17:00", "18:45", "1h 45m", 5300, 0, "UK-851", "Vistara"),
    ("Mumbai", "Bangalore", "20:45", "22:30", "1h 45m", 3650, 0, "QP-1601", "Akasa Air"),

    ("Delhi", "Mumbai", "06:00", "08:15", "2h 15m", 4650, 0, "6E-502", "IndiGo"),
    ("Delhi", "Mumbai", "12:00", "14:15", "2h 15m", 5250, 0, "AI-665", "Air India"),
    ("Delhi", "Mumbai", "18:00", "20:15", "2h 15m", 5900, 0, "UK-945", "Vistara"),
    ("Delhi", "Mumbai", "21:15", "23:30", "2h 15m", 3850, 0, "QP-1109", "Akasa Air"),

    ("Delhi", "Pune", "07:30", "09:45", "2h 15m", 4950, 0, "6E-205", "IndiGo"),
    ("Delhi", "Pune", "13:15", "15:30", "2h 15m", 4350, 0, "AI-806", "Air India"),
    ("Delhi", "Pune", "17:45", "20:00", "2h 15m", 5500, 0, "UK-993", "Vistara"),
]


def seed_database():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing flights
    cursor.execute("DELETE FROM flights")

    today = datetime.now().date()
    dates = [(today + timedelta(days=i)).isoformat() for i in range(7)]

    count = 0
    for travel_date in dates:
        for origin, destination, dep, arr, dur, base_price, stops, flt_no, airline in ROUTES:
            # Vary price slightly per date
            day_offset = (datetime.fromisoformat(travel_date).date() - today).days
            price = round(base_price + (day_offset * 150) + (100 if stops == 0 else -300), 2)
            
            cursor.execute("""
                INSERT INTO flights (
                    flight_number, airline, origin, destination, date,
                    departure_time, arrival_time, duration, price, stops, seats_available
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                flt_no, airline, origin, destination, travel_date,
                dep, arr, dur, price, stops, 15
            ))
            count += 1

    conn.commit()
    conn.close()
    print(f"Seeded {count} flight records successfully into SQLite database.")


if __name__ == "__main__":
    seed_database()
