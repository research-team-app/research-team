# Reference the existing shared IAM role rather than creating new ones.
# GlueRole-ResearchTeam is used by both Lambda functions and the Glue job.
data "aws_iam_role" "shared" {
  name = "GlueRole-ResearchTeam"
}

# Allow the link-provider Lambda to list and link Cognito users.
resource "aws_iam_role_policy" "cognito_link_provider" {
  name = "cognito-link-provider"
  role = data.aws_iam_role.shared.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminLinkProviderForUser",
          "cognito-idp:ListUsers",
        ]
        Resource = aws_cognito_user_pool.main.arn
      },
    ]
  })
}
