# CloudFront is managed outside Terraform — read-only reference, never modified.
data "aws_cloudfront_distribution" "frontend" {
  id = var.cloudfront_distribution_id
}
