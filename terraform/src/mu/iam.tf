resource "aws_iam_role" "mu_fargate_role" {
  count = var.enabled ? 1 : 0
  name  = "mu-fargate-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = [
            "ecs.amazonaws.com",
            "ecs-tasks.amazonaws.com",
            "ec2.amazonaws.com"
          ]
        }
      },
    ]
  })
}

resource "aws_iam_role_policy" "mu_fargate_policy" {
  count = var.enabled ? 1 : 0
  name  = "mu-fargate-policy"
  role  = aws_iam_role.mu_fargate_role.0.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}


resource "aws_iam_role" "mu_task_role" {
  count = var.enabled ? 1 : 0
  name  = "mu-task-role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": [
          "ecs.amazonaws.com",
          "ecs-tasks.amazonaws.com",
          "ec2.amazonaws.com"
        ]
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  inline_policy {
    name = "mu-task-role-policy"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = "ssm:*",
          Effect   = "Allow",
          Resource = aws_ssm_parameter.mu_ecr_image_revision.0.arn

        },
        {
          Action = [
            "sts:GetCallerIdentity"
          ]
          Effect   = "Allow"
          Resource = "*"
        },
        {
          Effect = "Allow"
          Action = [
            "SecretsManager:GetSecretValue"
          ]
          Resource = var.ao_wallet_arn
        }
      ]
    })
  }
}
