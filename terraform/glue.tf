resource "aws_glue_job" "grants_cron" {
  name            = "${var.project_name}-load-grants"
  description     = "Load grants from grants.gov to research.team database"
  role_arn        = data.aws_iam_role.shared.arn
  glue_version    = "3.0"
  max_capacity    = 0.0625 # Minimum for Python Shell (1/16 DPU)
  timeout         = 2880   # minutes
  execution_class = "STANDARD"

  command {
    name            = "pythonshell"
    script_location = "s3://${aws_s3_bucket.glue_job.id}/main.py"
    python_version  = "3.9"
  }

  default_arguments = {
    "--GRANTS_API_URL"              = "https://api.grants.gov/v1/api/search2"
    "--DB_DSN"                      = var.database_url
    "--DB_TABLE"                    = "grants"
    "--SUMMARY_TABLE"               = "grants_summary_cron"
    "--GRANTS_ROWS"                 = "100"
    "--EMBED_MODEL"                 = "cohere.embed-v4:0"
    "--VECTOR_BUCKET"               = "grants-vectors"
    "--VECTOR_INDEX"                = "grants-vectors-index"
    "--enable-observability-metrics" = "false"
    "--additional-python-modules"   = "async-timeout==4.0.3,httpx==0.27.0,asyncpg==0.30.0,tenacity==9.1.2,boto3==1.40.61,botocore==1.40.61"
    "--job-language"                = "python"
    "--TempDir"                     = "s3://aws-glue-assets-${data.aws_caller_identity.current.account_id}-${var.aws_region}/temporary/"
    "--enable-job-insights"         = "false"
    "--enable-glue-datacatalog"     = "true"
  }

  depends_on = [aws_s3_object.glue_script]
}
