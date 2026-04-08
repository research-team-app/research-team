# Cron — Grants Data Pipeline

AWS Glue Python Shell job that fetches grants from Grants.gov, upserts them into the database, and refreshes semantic embeddings nightly.

## What It Does

1. Fetches active grants from the Grants.gov API (80,000+ records)
2. Upserts records into the `grants` table in Aurora DSQL
3. Generates embeddings via Cohere `embed-v4` through AWS Bedrock
4. Stores vectors in AWS S3 Vectors (`grants-vectors-index`)

## Local Development

```bash
cd crons
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Create `crons/.env`:

```env
DB_DSN=<aurora_dsql_hostname>
```

## Deploy

GitHub Actions (`deploy-cron-job` job) — trigger with target `cron` or `all`:

1. Uploads `main.py` → `s3://research-team-glue-job/main.py`
2. Uploads `requirements.txt` → `s3://research-team-glue-job/requirements.txt`

The Glue job pulls the script from S3 on each run. Dependencies are installed via `--additional-python-modules` in the job config.

## Schedule

Runs automatically at midnight via AWS Glue trigger. Can also be started manually from the AWS Glue console.

## Glue Job Config

| Setting | Value |
| ------- | ----- |
| Type | Python Shell |
| Python version | 3.9 |
| DPU | 0.0625 (minimum) |
| Timeout | 48 hours |
| Embed model | `cohere.embed-v4:0` via Bedrock |
