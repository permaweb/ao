resource "aws_ecr_repository" "mu_ecr" {
  count                = var.enabled ? 1 : 0
  name                 = "mu-ecr"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository_policy" "mu_ecr_policy" {
  count      = var.enabled ? 1 : 0
  repository = aws_ecr_repository.mu_ecr.0.name
  policy = jsonencode({
    Version = "2008-10-17",
    Statement = [
      {
        Sid    = ""
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${var.principal_account_id}:root"
          ]
        }
        Action = "ecr:*"
      }
    ]
  })
}
