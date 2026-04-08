# ---------------------------------------------------------------------------
# Backend Lambda (container image via ECR + Lambda Web Adapter)
#
# IMPORTANT: Before the first `terraform apply`, push an initial image to ECR:
#   aws ecr get-login-password | docker login --username AWS --password-stdin <ecr_url>
#   docker build -t <ecr_url>:latest ./api
#   docker push <ecr_url>:latest
#
# After that, GitHub Actions manages image updates. Terraform ignores image_uri
# changes via lifecycle.ignore_changes.
# ---------------------------------------------------------------------------
resource "aws_lambda_function" "backend" {
  function_name = "${var.project_name}-backend"
  role          = data.aws_iam_role.shared.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"
  timeout       = 15
  memory_size   = 128

  environment {
    variables = {
      DATABASE_URL             = var.database_url
      INTERNAL_API_KEY         = var.internal_api_key
      AWS_LWA_PORT             = "8080"
      AWS_LWA_REMOVE_BASE_PATH = "/prod"
      COGNITO_REGION           = var.aws_region
      COGNITO_USER_POOL_ID     = aws_cognito_user_pool.main.id
    }
  }

  lifecycle {
    # GitHub Actions pushes new images; Terraform only creates the function.
    ignore_changes = [image_uri]
  }

  depends_on = [aws_ecr_repository.backend]
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/aws/lambda/${aws_lambda_function.backend.function_name}"
  retention_in_days = 0
}

# Allow API Gateway to invoke the backend Lambda
resource "aws_lambda_permission" "api_gateway_backend" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ---------------------------------------------------------------------------
# add-user-db Lambda (Cognito post-confirmation trigger)
# ---------------------------------------------------------------------------
data "archive_file" "add_user_db" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/add-user-db"
  output_path = "${path.module}/.terraform/add-user-db.zip"
}

resource "aws_lambda_function" "add_user_db" {
  function_name    = "add-user-db"
  description      = "Lamba to create  automate the user creation in database for research team"
  role             = data.aws_iam_role.shared.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.13"
  filename         = data.archive_file.add_user_db.output_path
  source_code_hash = data.archive_file.add_user_db.output_base64sha256
  timeout          = 60
  memory_size      = 128

  environment {
    variables = {
      API_URL          = aws_apigatewayv2_api.main.api_endpoint
      INTERNAL_API_KEY = var.internal_api_key
    }
  }

  lifecycle {
    # Code is deployed via GitHub Actions (or manually). Terraform only creates
    # the function and manages config — never touches the deployed zip.
    ignore_changes = [runtime, filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "add_user_db" {
  name              = "/aws/lambda/${aws_lambda_function.add_user_db.function_name}"
  retention_in_days = 14
}

# Allow Cognito to invoke the add-user-db Lambda
resource "aws_lambda_permission" "cognito_add_user_db" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.add_user_db.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# ---------------------------------------------------------------------------
# link-provider Lambda (Cognito PreSignUp trigger)
# Auto-links Google/OAuth sign-ups to existing native accounts with same email,
# preventing duplicate Cognito identities and DB profile ID conflicts.
# ---------------------------------------------------------------------------
data "archive_file" "link_provider" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/link-provider"
  output_path = "${path.module}/.terraform/link-provider.zip"
}

resource "aws_lambda_function" "link_provider" {
  function_name    = "link-provider"
  description      = "PreSignUp trigger: links Google/OAuth accounts to existing native Cognito users with the same email"
  role             = data.aws_iam_role.shared.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.13"
  filename         = data.archive_file.link_provider.output_path
  source_code_hash = data.archive_file.link_provider.output_base64sha256
  timeout          = 10
  memory_size      = 128
}

resource "aws_cloudwatch_log_group" "link_provider" {
  name              = "/aws/lambda/${aws_lambda_function.link_provider.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_permission" "cognito_link_provider" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.link_provider.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
