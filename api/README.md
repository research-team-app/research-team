# Backend

FastAPI app running as a containerised AWS Lambda function behind API Gateway v2.

## Stack

FastAPI · Python 3.12 · asyncpg · boto3 · AWS Lambda Web Adapter

## Local Development

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
fastapi dev main.py --port 8080   # http://localhost:8080
```

Create `api/.env`:

```env
DATABASE_URL=<aurora_dsql_hostname>
INTERNAL_API_KEY=<any_strong_secret>
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=<pool_id>
```

Or use Docker Compose from the project root:

```bash
docker compose up
```

## Run with Docker

```bash
docker build -t research-team-api .
docker run -p 8080:8080 --env-file .env research-team-api
```

## Deploy

GitHub Actions (`deploy-back-end` job) — trigger with target `backend` or `all`:

1. Builds Docker image for `linux/amd64`
2. Pushes to ECR (`research-team/backend-image:latest`)
3. Updates Lambda function code

## Required GitHub Secrets

| Secret | Description |
| ------ | ----------- |
| `ECR_REPOSITORY` | ECR registry base URL |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Deploy IAM credentials |

## Lambda Environment Variables

Set in AWS Lambda console or via Terraform:

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | Aurora DSQL cluster hostname |
| `INTERNAL_API_KEY` | Shared secret for Lambda-to-API auth |
| `COGNITO_REGION` | `us-east-1` |
| `COGNITO_USER_POOL_ID` | Cognito user pool ID |
