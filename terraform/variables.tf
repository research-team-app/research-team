variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used as a prefix for resource names"
  type        = string
  default     = "research-team"
}

variable "google_client_id" {
  description = "Google OAuth client ID for Cognito identity provider"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret for Cognito identity provider"
  type        = string
  sensitive   = true
}

variable "internal_api_key" {
  description = "Internal API key used by the Cognito post-confirmation Lambda to call the backend"
  type        = string
  sensitive   = true
}

variable "cognito_domain_prefix" {
  description = "Prefix for the Cognito hosted UI domain (must be globally unique)"
  type        = string
  default     = "research-team-auth"
}

variable "app_domain" {
  description = "Optional custom domain (e.g. research.team). Leave empty to use CloudFront domain only."
  type        = string
  default     = ""
}

variable "database_url" {
  description = "Aurora DSQL cluster hostname — copy from AWS console (managed outside Terraform for now)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for the custom domain (must be in us-east-1)"
  type        = string
  default     = ""
}

variable "cloudfront_function_arn" {
  description = "ARN of the CloudFront viewer-request function (e.g. URL rewrite)"
  type        = string
  default     = ""
}

variable "cloudfront_distribution_id" {
  description = "Existing CloudFront distribution ID (managed outside Terraform) — find it in the AWS Console under CloudFront > Distributions (format: E1XXXXXXXXX)"
  type        = string
}
