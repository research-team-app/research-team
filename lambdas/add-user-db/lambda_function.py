import json
import urllib.request
import urllib.error
import os
import sys
import random
import time


def _get_internal_token(api_base_url: str, internal_api_key: str) -> str:
    """Exchange INTERNAL_API_KEY for a Bearer token from POST /auth/token."""
    token_url = api_base_url.rstrip("/") + "/auth/token"
    payload = json.dumps({"api_key": internal_api_key}).encode("utf-8")
    req = urllib.request.Request(
        token_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["access_token"]


def lambda_handler(event, context):
    print("Received event:", json.dumps(event))

    # If this is a Password Reset, just return success and exit immediately.
    if event.get("triggerSource") == "PostConfirmation_ConfirmForgotPassword":
        print("Skipping sync for Forgot Password flow.")
        return event

    try:
        attributes = event["request"]["userAttributes"]

        # API_URL = base URL of your API Gateway (e.g. https://your-api-id.execute-api.us-east-1.amazonaws.com/prod)
        # INTERNAL_API_KEY = set in Lambda environment (same value as API's INTERNAL_API_KEY)
        api_base = (os.environ.get("API_URL") or "").strip().rstrip("/")
        internal_api_key = (os.environ.get("INTERNAL_API_KEY") or "").strip()

        if not api_base:
            print("ERROR: API_URL environment variable is missing.")
            return event
        if not internal_api_key:
            print("ERROR: INTERNAL_API_KEY environment variable is missing.")
            return event

        users_url = api_base + "/users"

        # Get Bearer token so the API accepts our create-user request
        token = _get_internal_token(api_base, internal_api_key)
        auth_header = f"Bearer {token}"

        # Retry api call if we get 409 conflict
        for attempt in range(5):
            try:
                # generate random number for this username
                generated_username = (
                    f"{attributes['email'].split('@')[0]}{random.randint(1000, 9999)}"
                )

                print(f"Attempt {attempt + 1}: Trying username: {generated_username}")

                payload = {
                    "id": attributes["sub"],
                    "username": generated_username,
                    "email": attributes["email"],
                    "first_name": attributes.get("given_name", ""),
                    "last_name": attributes.get("family_name", ""),
                }

                req = urllib.request.Request(
                    users_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": auth_header,
                    },
                    method="POST",
                )

                with urllib.request.urlopen(req, timeout=10) as response:
                    response_body = response.read().decode("utf-8")
                    print(f"API Success: {response.status}")
                    print(f"API Response: {response_body}")
                    break
            except urllib.error.HTTPError as e:
                if e.code == 409:
                    print(f"Username collision with ({generated_username})")
                    time.sleep(0.5)
                    continue
                body = e.fp.read().decode("utf-8") if e.fp else ""
                print(f"API error: {e.code} {e.reason}. Response: {body}")
                if e.code >= 500:
                    # Server-side error — do not raise so Cognito confirmation
                    # still completes. ensureUserProfile on the frontend will
                    # create the DB record on next login.
                    print("Server error from API — skipping DB sync, user confirmed in Cognito.")
                    return event
                raise e
    except Exception as e:
        print(f"FAILED to sync user to database: {str(e)}")
        # Don't re-raise: PostConfirmation must not block the user's sign-up
        # confirmation. ensureUserProfile (frontend) will recover on next login.

    return event
