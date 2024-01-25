resource "aws_iam_role" "su_task_role" {
  count       = var.enabled ? 1 : 0
  name        = "su-task-role"
  description = "IAM role used by su runtime"
  assume_role_policy = jsonencode(
    {
      Statement = [
        {
          Action = "sts:AssumeRole"
          Effect = "Allow",
          Principal = {
            Service = "ec2.amazonaws.com"
          }
        },
      ]
      Version = "2012-10-17"
  })
}

resource "aws_iam_policy" "su_task_policy" {
  count = var.enabled ? 1 : 0
  policy = jsonencode(
    {
      Statement = [
        {
          Action = [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:DescribeLogGroups",
            "logs:DescribeLogStreams",
            "logs:PutLogEvents",
            "logs:PutRetentionPolicy"
          ]
          Effect   = "Allow"
          Resource = "*"
        },
        {
          Effect = "Allow"
          Action = [
            "ec2:CreateSnapshot",
            "ec2:CreateTags",
            "ec2:DescribeVolumes"
          ]
          Resource = "*"
        },
        {
          Effect = "Allow"
          Action = [
            "events:PutRule",
            "events:PutTargets"
          ]
          Resource = "*"
        },
        {
          Action = [
            "SecretsManager:GetSecretValue"
          ]
          Effect = "Allow"
          Resource = [
            var.ao_wallet_arn,
            "${var.ao_wallet_arn}*"
          ]
        },
        {
          Action = [
            "lambda:InvokeFunction",
          ],
          Effect = "Allow",
          Resource = [
            aws_lambda_function.assignment_finder.arn
          ]
        },
        {
          Effect   = "Allow",
          Action   = "route53:ChangeResourceRecordSets",
          Resource = "arn:aws:route53:::hostedzone/${var.hosted_zone_id}"
        }
      ]
      Version = "2012-10-17"
  })
}

resource "aws_iam_role_policy_attachment" "su_task_policy_attachment" {
  count      = var.enabled ? 1 : 0
  role       = aws_iam_role.su_task_role.0.name
  policy_arn = aws_iam_policy.su_task_policy.0.arn
}

resource "aws_iam_role_policy_attachment" "su_ssm_role_attachment" {
  count      = var.enabled ? 1 : 0
  role       = aws_iam_role.su_task_role.0.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM"
}

resource "aws_iam_instance_profile" "su_task_profile" {
  count = var.enabled ? 1 : 0
  name  = "su-task-profile"
  role  = aws_iam_role.su_task_role.0.name
}

resource "aws_iam_role" "assignment_finder_role" {
  name = "assignment-finder-role"
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

resource "aws_iam_role_policy" "assignment_finder_policy" {
  name = "assignment-finder-policy"
  role = aws_iam_role.assignment_finder_role.name
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
      }
    ]
  })
}


