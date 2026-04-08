resource "aws_cognito_user_pool" "main" {
  name = var.project_name

  deletion_protection      = "ACTIVE"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  # Schema attributes cannot be modified after pool creation.
  # Existing attributes: email (required), given_name (required), family_name (required)

  lifecycle {
    ignore_changes = [schema]
  }

  lambda_config {
    post_confirmation = aws_lambda_function.add_user_db.arn
    pre_sign_up       = aws_lambda_function.link_provider.arn
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  lifecycle {
    # Google credentials are managed in AWS console; ignore to prevent accidental overwrites.
    ignore_changes = [provider_details]
  }

  provider_details = {
    client_id                     = var.google_client_id
    client_secret                 = var.google_client_secret
    authorize_scopes              = "profile email openid"
    attributes_url                = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes = "true"
    authorize_url                 = "https://accounts.google.com/o/oauth2/v2/auth"
    oidc_issuer                   = "https://accounts.google.com"
    token_request_method          = "POST"
    token_url                     = "https://www.googleapis.com/oauth2/v4/token"
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    given_name     = "given_name"
    family_name    = "family_name"
    username       = "sub"
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = var.project_name
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  lifecycle {
    ignore_changes = [generate_secret, name, token_validity_units]
  }

  supported_identity_providers = ["COGNITO", "Google"]

  callback_urls = compact([
    "https://${data.aws_cloudfront_distribution.frontend.domain_name}",
    var.app_domain != "" ? "https://${var.app_domain}" : "",
    "http://localhost:3000",
  ])

  logout_urls = compact([
    "https://${data.aws_cloudfront_distribution.frontend.domain_name}",
    var.app_domain != "" ? "https://${var.app_domain}" : "",
    "http://localhost:3000",
  ])

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile", "aws.cognito.signin.user.admin"]
  allowed_oauth_flows_user_pool_client = true

  prevent_user_existence_errors = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_AUTH",
  ]

  depends_on = [aws_cognito_identity_provider.google]
}
