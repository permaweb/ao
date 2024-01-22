resource "aws_iam_role" "cu_task_role" {
  count       = var.enabled ? 1 : 0
  name        = "cu-task-role"
  description = "IAM role used by cu runtime"
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

resource "aws_iam_policy" "cu_task_policy" {
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
            "ssm:GetParameter"
          ]
          Effect = "Allow"
          Resource = [
            "${aws_ssm_parameter.cu_ami_id.0.arn}"
          ]
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
        }
      ]
      Version = "2012-10-17"
  })
}

resource "aws_iam_role_policy_attachment" "cu_task_policy_attachment" {
  count      = var.enabled ? 1 : 0
  role       = aws_iam_role.cu_task_role.0.name
  policy_arn = aws_iam_policy.cu_task_policy.0.arn
}

resource "aws_iam_role_policy_attachment" "cu_ssm_role_attachment" {
  count      = var.enabled ? 1 : 0
  role       = aws_iam_role.cu_task_role.0.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM"
}

resource "aws_iam_instance_profile" "cu_task_profile" {
  count = var.enabled ? 1 : 0
  name  = "cu-task-profile"
  role  = aws_iam_role.cu_task_role.0.name
}
