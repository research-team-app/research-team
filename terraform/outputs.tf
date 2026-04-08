output "cloudfront_domain" {
  description = "CloudFront distribution domain — use as NEXT_PUBLIC_* base URL in the frontend"
  value       = "https://${data.aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used in GitHub Actions for cache invalidation"
  value       = data.aws_cloudfront_distribution.frontend.id
}

output "frontend_s3_bucket" {
  description = "S3 bucket name — used in GitHub Actions to sync the Next.js build"
  value       = aws_s3_bucket.frontend.id
}

output "api_gateway_url" {
  description = "API Gateway invoke URL — use as NEXT_PUBLIC_API_URL in the frontend"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID — use as NEXT_PUBLIC_COGNITO_USER_POOL_ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID — use as NEXT_PUBLIC_COGNITO_CLIENT_ID"
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain — use as NEXT_PUBLIC_COGNITO_DOMAIN"
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "ecr_registry" {
  description = "ECR registry base URL — use as ECR_REPOSITORY in GitHub Actions (for docker login)"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "ecr_image_uri" {
  description = "Full ECR image URI — use as ECR_IMAGE_URI in GitHub Actions"
  value       = "${aws_ecr_repository.backend.repository_url}:latest"
}

# DSQL is managed outside Terraform for now — get the hostname from AWS console
# and set database_url in terraform.tfvars

# -----------------------------------------------------------------------
# Print everything needed for GitHub Actions secrets and .env files in one place.
# -----------------------------------------------------------------------
output "github_secrets" {
  description = "Copy these values into GitHub Actions secrets"
  sensitive   = true
  value = {
    AWS_S3_BUCKET                    = aws_s3_bucket.frontend.id
    DISTRIBUTION_ID                  = data.aws_cloudfront_distribution.frontend.id
    ECR_REPOSITORY                   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    NEXT_PUBLIC_API_URL              = aws_apigatewayv2_stage.default.invoke_url
    NEXT_PUBLIC_COGNITO_USER_POOL_ID = aws_cognito_user_pool.main.id
    NEXT_PUBLIC_COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.web.id
    NEXT_PUBLIC_COGNITO_DOMAIN       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
    DATABASE_URL                     = var.database_url
  }
}

output "ui_env" {
  description = "Paste into ui/.env for local development"
  value = <<-ENV
NEXT_PUBLIC_IS_LOCAL=false
NEXT_PUBLIC_API_URL=${aws_apigatewayv2_stage.default.invoke_url}
NEXT_PUBLIC_COGNITO_USER_POOL_ID=${aws_cognito_user_pool.main.id}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${aws_cognito_user_pool_client.web.id}
NEXT_PUBLIC_COGNITO_DOMAIN=${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com
  ENV
}
