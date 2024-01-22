module "mu" {

  source = "./mu"

  enabled       = true
  region        = var.region
  vpc_id        = aws_vpc.default.id
  ao_wallet_arn = data.aws_secretsmanager_secret.ao-wallet.arn

  ecs_environment_variables = [
    {
      name : "AWS_DEFAULT_REGION",
      value : var.region
    },
    {
      name : "AWS_REGION",
      value : var.region
    },
    {
      name : "NODE_CONFIG_ENV",
      value : "production"
    }
  ]

  principal_account_id = data.aws_caller_identity.current.account_id
  private_subnet_ids   = aws_subnet.private[*].id
  private_subnet_cidrs = aws_subnet.private[*].cidr_block
}

# module "cu" {

#   source = "./cu"

#   enabled       = true
#   region        = var.region
#   vpc_id        = aws_vpc.default.id
#   ao_wallet_arn = data.aws_secretsmanager_secret.ao-wallet.arn

#   ecs_environment_variables = [
#     {
#       name : "AWS_DEFAULT_REGION",
#       value : var.region
#     },
#     {
#       name : "AWS_REGION",
#       value : var.region
#     },
#     {
#       name : "NODE_CONFIG_ENV",
#       value : "production"
#     }
#   ]

#   principal_account_id = data.aws_caller_identity.current.account_id
#   private_subnet_ids   = aws_subnet.private[*].id
#   private_subnet_cidrs = aws_subnet.private[*].cidr_block
# }
