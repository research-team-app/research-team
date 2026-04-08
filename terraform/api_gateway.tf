resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = compact([
      "https://${data.aws_cloudfront_distribution.frontend.domain_name}",
      var.app_domain != "" ? "https://${var.app_domain}" : "",
      "http://localhost:3000",
    ])
    allow_methods     = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "*"]
    allow_headers     = ["Authorization", "Content-Type"]
    expose_headers    = ["authorization", "content-type"]
    allow_credentials = true
    max_age           = 3600
  }
}

resource "aws_apigatewayv2_integration" "backend" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  # access_log_settings omitted — stage is live and does not currently have logging enabled.
  # Add this back once ready to enable access logging without disrupting production.

  default_route_settings {
    throttling_burst_limit = 1000
    throttling_rate_limit  = 1000
  }
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}"
  retention_in_days = 14
}
