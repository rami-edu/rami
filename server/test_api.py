import requests
import time
import sqlite3

BASE_URL = "http://localhost:8000"

def test_api():
    print("Testing Registration...")
    response = requests.post(f"{BASE_URL}/register", json={"email": "test@parent.com"})
    assert response.status_code == 200
    print("Registration OK")

    print("Testing OTP Request...")
    response = requests.post(f"{BASE_URL}/login/request-otp", json={"email": "test@parent.com"})
    assert response.status_code == 200
    print("OTP Request OK")

    # Connect to sqlite to get the OTP
    print("Fetching OTP from DB...")
    conn = sqlite3.connect("rami.db")
    cursor = conn.cursor()
    cursor.execute("SELECT code FROM otps WHERE email='test@parent.com' ORDER BY id DESC LIMIT 1")
    otp_code = cursor.fetchone()[0]
    conn.close()
    print(f"Got OTP: {otp_code}")

    print("Testing OTP Verification...")
    response = requests.post(f"{BASE_URL}/login/verify-otp", json={"email": "test@parent.com", "otp": otp_code})
    assert response.status_code == 200
    token = response.json()["access_token"]
    print("OTP Verification OK, Token received")

    print("Testing Admin Login...")
    response = requests.post(f"{BASE_URL}/login/admin", data={"username": "admin", "password": "admin"})
    assert response.status_code == 200
    admin_token = response.json()["access_token"]
    print("Admin Login OK, Token received")

    print("Testing Google Login Mock...")
    response = requests.post(f"{BASE_URL}/login/google", json={"email": "google@parent.com"})
    assert response.status_code == 200
    google_token = response.json()["access_token"]
    print("Google Login Mock OK, Token received")

    print("Testing Profile Creation...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/profiles", json={"name": "Alice"}, headers=headers)
    assert response.status_code == 200
    child_id = response.json()["id"]
    print(f"Profile Creation OK, Child ID: {child_id}")

    print("Testing Character Creation...")
    response = requests.post(f"{BASE_URL}/profiles/{child_id}/character", json={"name": "Alice's Dino", "type": "Quartz Dinosaur"}, headers=headers)
    assert response.status_code == 200
    print("Character Creation OK")

    print("Testing Get Profiles...")
    response = requests.get(f"{BASE_URL}/profiles", headers=headers)
    assert response.status_code == 200
    profiles = response.json()
    assert len(profiles) > 0
    assert profiles[0]["name"] == "Alice"
    assert len(profiles[0]["characters"]) > 0
    assert profiles[0]["characters"][0]["type"] == "Quartz Dinosaur"
    print("Get Profiles OK")

    print("All tests passed!")

if __name__ == "__main__":
    test_api()
