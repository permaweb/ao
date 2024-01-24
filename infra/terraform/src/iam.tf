resource "aws_iam_role" "slack_lambda_handler_role" {
  name = "slack-lambda-handler-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = [
            "lambda.amazonaws.com"
          ]
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "slack_lambda_handler_policy" {
  name = "slack-lambda-handler-policy"
  role = aws_iam_role.slack_lambda_handler_role.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = [
          "arn:aws:logs:*:*:*"
        ]
      },
      {
        Action = [
          "ec2:DeleteNetworkInterface",
          "ec2:DeleteSnapshot",
          "ec2:DescribeSnapshots",
          "ec2:DescribeInstances",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeLaunchTemplates",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:CreateTags",
          "ec2:CreateNetworkInterface",
          "ec2:CreateLaunchTemplateVersion",
          "ssm:SendCommand",
          "events:DeleteRule",
          "events:RemoveTargets"
        ],
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "SecretsManager:GetSecretValue",
        ],
        Effect = "Allow",
        Resource = [
          data.aws_secretsmanager_secret.slackbot-oauth-token.arn,
          "${data.aws_secretsmanager_secret.slackbot-oauth-token.arn}*"
        ]
      }
    ]
  })
}


