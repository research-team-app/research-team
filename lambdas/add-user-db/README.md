# add-user-db Lambda (Cognito Post-confirmation)

Syncs new Cognito users to the Research Team API database. Runs as a **Post-confirmation** trigger.

## Required environment variables (Lambda config in AWS)

| Variable | Description |
|----------|-------------|
| `API_URL` | Base URL of the API (no path), e.g. `https://your-api-id.execute-api.us-east-1.amazonaws.com/prod` |
| `INTERNAL_API_KEY` | Set in the Lambda environment. Use the same value as `INTERNAL_API_KEY` in the API’s `.env`. Used to obtain a Bearer token so the Lambda can call `POST /users`. |

## Google / federated sign-in

Post-confirmation is invoked after **ConfirmSignUp**. For **federated sign-in (e.g. Google)**, some Cognito setups do not fire Post-confirmation on the first Google login. If users created via Google never appear in the database:

1. Confirm this Lambda is attached to the User Pool’s **Post-confirmation** trigger in the Cognito console.
2. If it still doesn’t run for Google, consider adding a **Post-authentication** Lambda that creates the user in the DB on first sign-in (e.g. when the user doesn’t exist yet), or have the frontend call an “ensure my user exists” endpoint after login.
