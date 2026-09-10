import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db, hash_password, verify_password, get_user_by_username_or_email

client = TestClient(app)


def setup_module():
    init_db()


def test_password_hashing():
    pwd = "SecurePassword123!"
    hashed, salt = hash_password(pwd)
    assert hashed != pwd
    assert len(salt) > 0
    assert verify_password(pwd, hashed, salt) is True
    assert verify_password("WrongPassword", hashed, salt) is False


def test_seed_user_exists():
    user = get_user_by_username_or_email("demo")
    assert user is not None
    assert user["username"] == "demo"
    assert user["email"] == "demo@voicebook.ai"
    assert verify_password("Password123!", user["hashed_password"], user["salt"]) is True


def test_login_success_with_email():
    res = client.post("/api/auth/login", json={
        "username_or_email": "demo@voicebook.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["username"] == "demo"


def test_login_success_with_username():
    res = client.post("/api/auth/login", json={
        "username_or_email": "demo",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data


def test_login_invalid_password():
    res = client.post("/api/auth/login", json={
        "username_or_email": "demo@voicebook.ai",
        "password": "IncorrectPassword"
    })
    assert res.status_code == 401
    assert "Invalid" in res.json()["detail"]


def test_login_nonexistent_user():
    res = client.post("/api/auth/login", json={
        "username_or_email": "nobody@example.com",
        "password": "SomePassword"
    })
    assert res.status_code == 401


def test_guest_endpoint():
    res = client.post("/api/auth/guest")
    assert res.status_code == 200
    data = res.json()
    assert data["is_guest"] is True
    assert "guest_id" in data
    assert data["guest_id"].startswith("guest-")


def test_logout_endpoint():
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_register_success_and_login():
    import uuid
    rand_id = uuid.uuid4().hex[:6]
    username = f"traveler_{rand_id}"
    email = f"traveler_{rand_id}@example.com"
    pwd = "FlightSecret2026!"
    name = "Test Traveler"

    # 1. Create account
    reg_res = client.post("/api/auth/register", json={
        "name": name,
        "username": username,
        "email": email,
        "password": pwd
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["success"] is True
    assert "token" in reg_data
    assert reg_data["user"]["username"] == username
    assert reg_data["user"]["email"] == email
    # Verify plaintext password is never in the response
    assert "password" not in reg_data["user"]

    # 2. Verify database stored hashed password, not plaintext
    db_user = get_user_by_username_or_email(username)
    assert db_user is not None
    assert db_user["hashed_password"] != pwd
    assert verify_password(pwd, db_user["hashed_password"], db_user["salt"]) is True

    # 3. Login with newly created username
    login_res = client.post("/api/auth/login", json={
        "username_or_email": username,
        "password": pwd
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    assert login_data["user"]["username"] == username

    # 4. Login with newly created email
    login_res2 = client.post("/api/auth/login", json={
        "username_or_email": email,
        "password": pwd
    })
    assert login_res2.status_code == 200
    assert login_res2.json()["success"] is True


def test_register_duplicate_username():
    res = client.post("/api/auth/register", json={
        "name": "Duplicate User",
        "username": "demo",
        "email": "unique_email_123@example.com",
        "password": "ValidPassword123!"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


def test_register_duplicate_email():
    res = client.post("/api/auth/register", json={
        "name": "Duplicate Email",
        "username": "unique_username_123",
        "email": "demo@voicebook.ai",
        "password": "ValidPassword123!"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


def test_register_short_password():
    res = client.post("/api/auth/register", json={
        "name": "Short Pwd",
        "username": "user_short_pwd",
        "email": "short@example.com",
        "password": "123"
    })
    assert res.status_code == 400
    assert "at least 6" in res.json()["detail"]


def test_register_invalid_email():
    res = client.post("/api/auth/register", json={
        "name": "Invalid Email",
        "username": "user_invalid_email",
        "email": "notanemail",
        "password": "ValidPassword123!"
    })
    assert res.status_code == 400
    assert "valid email" in res.json()["detail"].lower()

