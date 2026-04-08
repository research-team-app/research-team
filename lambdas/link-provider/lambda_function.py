"""
PreSignUp Cognito trigger — auto-link federated (Google) sign-ups to an
existing native email/password account with the same email address.

Without this, a user who first signs up with email/password and later uses
"Sign in with Google" ends up with two separate Cognito identities (different
subs) for the same email, causing duplicate DB profiles and ID conflicts.

With this trigger:
  1. User signs in with Google for the first time.
  2. PreSignUp fires before the Google user is created in the pool.
  3. We look up whether a native Cognito user with the same email already exists.
  4. If yes  → admin_link_provider_for_user merges the Google identity into the
              existing native account. Cognito then uses the native account's sub
              for all tokens, so the DB profile ID is consistent.
  5. If no   → let the sign-up proceed normally; PostConfirmation will create the
              DB record.
"""

import boto3
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info("PreSignUp event: %s", json.dumps(event))

    trigger_source = event.get("triggerSource", "")

    # Only act on federated sign-ups (Google, Facebook, etc.)
    if not trigger_source.startswith("PreSignUp_ExternalProvider"):
        return event

    user_pool_id = event["userPoolId"]
    email = event["request"]["userAttributes"].get("email", "").lower().strip()
    external_username = event["userName"]  # e.g. "google_107250448787567689045"

    if not email:
        logger.warning("No email in PreSignUp attributes; skipping link.")
        return event

    # Parse provider name and subject from the federated username.
    # Cognito format: "<ProviderName>_<ProviderSubject>"
    underscore = external_username.find("_")
    if underscore == -1:
        logger.warning("Unexpected external username format: %s", external_username)
        return event

    provider_name = external_username[:underscore].capitalize()   # "Google"
    provider_subject = external_username[underscore + 1:]         # "107250448787567689045"

    try:
        client = boto3.client("cognito-idp")

        # Find native Cognito users with this email.
        # Native users (username_attributes=["email"]) have their email as username.
        response = client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=10,
        )

        # A native user's username is their email address (contains "@").
        # Federated users have "<provider>_<subject>" usernames (no "@").
        native_user = next(
            (u for u in response.get("Users", []) if "@" in u.get("Username", "")),
            None,
        )

        if not native_user:
            logger.info(
                "No existing native user for email %s — allowing new %s account.",
                email,
                provider_name,
            )
            return event

        native_username = native_user["Username"]
        logger.info(
            "Linking %s identity to existing native user: %s",
            provider_name,
            native_username,
        )

        client.admin_link_provider_for_user(
            UserPoolId=user_pool_id,
            DestinationUser={
                "ProviderName": "Cognito",
                "ProviderAttributeValue": native_username,
            },
            SourceUser={
                "ProviderName": provider_name,
                "ProviderAttributeName": "Cognito_Subject",
                "ProviderAttributeValue": provider_subject,
            },
        )

        logger.info("Successfully linked %s to native user %s.", provider_name, native_username)

    except Exception as e:
        # Never block the sign-up due to a linking error.
        # The user will land in a duplicate-account state which ensureUserProfile
        # resolves via the email-based recovery path in POST /users.
        logger.error("PreSignUp linking failed (non-fatal): %s", e)

    return event
