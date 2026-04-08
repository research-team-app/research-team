# ---------------------------------------------------------------------------
# Frontend static site bucket (private, served via CloudFront OAC)
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "frontend" {
  bucket = "research.team"
}

# Public access block is NOT managed here — the frontend bucket uses S3 website
# hosting with a public bucket policy, so blocking public access would break it.

# S3 bucket policy for frontend is managed outside Terraform (existing website-hosting setup).
# Do not manage here to avoid overwriting the live policy.

# ---------------------------------------------------------------------------
# Profile pictures bucket
# NOTE: name is hardcoded in api/routers/profile_picture.py as "rt-profile-pictures".
# If this name is taken globally, rename both here and in the source file.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "profile_pictures" {
  bucket = "rt-profile-pictures"
}

resource "aws_s3_bucket_public_access_block" "profile_pictures" {
  bucket                  = aws_s3_bucket.profile_pictures.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "profile_pictures" {
  bucket = aws_s3_bucket.profile_pictures.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = compact([
      "https://${data.aws_cloudfront_distribution.frontend.domain_name}",
      var.app_domain != "" ? "https://${var.app_domain}" : "",
      "http://localhost:3000",
    ])
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ---------------------------------------------------------------------------
# Resumes / CV bucket
# NOTE: name is hardcoded in api/routers/resume.py as "rt-resumes".
# If this name is taken globally, rename both here and in the source file.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "resumes" {
  bucket = "rt-resumes"
}

resource "aws_s3_bucket_public_access_block" "resumes" {
  bucket                  = aws_s3_bucket.resumes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = compact([
      "https://${data.aws_cloudfront_distribution.frontend.domain_name}",
      var.app_domain != "" ? "https://${var.app_domain}" : "",
      "http://localhost:3000",
    ])
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ---------------------------------------------------------------------------
# Glue job scripts bucket
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "glue_job" {
  bucket = "${var.project_name}-glue-job"
}

resource "aws_s3_bucket_public_access_block" "glue_job" {
  bucket                  = aws_s3_bucket.glue_job.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "glue_script" {
  bucket = aws_s3_bucket.glue_job.id
  key    = "main.py"
}

resource "aws_s3_object" "glue_requirements" {
  bucket = aws_s3_bucket.glue_job.id
  key    = "requirements.txt"
}
