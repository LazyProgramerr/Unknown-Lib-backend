import requests
import json

BASE_URL = "https://unknown-lib-backend.onrender.com"

def test_endpoint(name, method, path, data=None):
    url = f"{BASE_URL}{path}"
    print(f"Testing {name} ({method} {path})...")
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        
        print(f"  Status Code: {response.status_code}")
        try:
            print(f"  Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"  Response (Text): {response.text[:200]}")
        print("-" * 20)
        return response
    except Exception as e:
        print(f"  Error: {e}")
        print("-" * 20)
        return None

def main():
    print(f"Target Server: {BASE_URL}")
    print("=" * 30)

    # 1. Admin Dashboard (should be 403 or 200 depending on code)
    test_endpoint("Admin Dashboard", "GET", "/admin/dashboard")

    # 2. Link Token Generation
    link_resp = test_endpoint("Link Token", "POST", "/otp/link-token", {"userId": "test_agent_01"})

    # 3. Request OTP (should fail with 400 'Telegram account not linked' if user is new)
    test_endpoint("Request OTP", "POST", "/otp/request-otp", {"userId": "test_agent_01"})

if __name__ == "__main__":
    main()
