# Terraform

AWS infrastructure for the Research Team platform.

## What Is Managed

| Resource | Notes |
| -------- | ----- |
| API Gateway v2 (HTTP) | Routes all traffic to backend Lambda |
| Lambda — `research-team-backend` | Container image from ECR |
| Lambda — `add-user-db` | Cognito post-confirmation trigger |
| ECR repository | `research-team/backend-image` |
| Cognito User Pool + Google OAuth | Email + Google login |
| S3 buckets | Profile pictures, resumes, Glue scripts |
| Glue job | `research-team-load-grants` |
| CloudWatch log groups | Lambda + API Gateway |

**Managed outside Terraform** (do not import or modify via TF):
CloudFront, Aurora DSQL, S3 Vectors

## Prerequisites

- Terraform >= 1.9
- AWS CLI configured (`aws configure`)
- S3 state bucket exists: `YOUR_TF_STATE_BUCKET` (create it manually before running `terraform init`)

## Setup

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# fill in terraform.tfvars with real values
terraform init
```

## Usage

```bash
terraform plan    # preview changes
terraform apply   # apply changes
```

## terraform.tfvars

Copy from `terraform.tfvars.example` and fill in:

| Variable | Description |
| -------- | ----------- |
| `database_url` | Aurora DSQL cluster hostname |
| `internal_api_key` | Shared secret for Lambda-to-API auth |
| `google_client_id` | Google OAuth client ID (not used — managed in AWS console) |
| `google_client_secret` | Google OAuth client secret (not used — managed in AWS console) |
| `cloudfront_distribution_id` | Existing CloudFront distribution ID (e.g. `E1XXXXXXXXX`) |
| `app_domain` | Custom domain (`research.team`) |
| `acm_certificate_arn` | ACM cert ARN for the custom domain |

`terraform.tfvars` is gitignored — never commit it.

## State

Remote state is stored in S3 with locking enabled. Always run `terraform plan` before `apply`.
