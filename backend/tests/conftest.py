import os
import sys
import pytest

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.database import init_db
from app.database.seed import seed_database
from app.config import settings

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Use temporary test database
    settings.DB_PATH = os.path.join(backend_dir, "data", "test_flights.db")
    settings.FLIGHT_SEARCH_DELAY_SECONDS = 0.05
    init_db()
    seed_database()
    yield
    # Cleanup test DB if desired
    if os.path.exists(settings.DB_PATH):
        try:
            os.remove(settings.DB_PATH)
        except Exception:
            pass
