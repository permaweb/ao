module "mu" {

  source = "./mu"

  enabled = true
  region  = var.region
  vpc_id  = aws_vpc.default.id

  ecs_environment_variables = [{
    name : "AWS_DEFAULT_REGION",
    value : var.region
  }]

  principal_account_id = data.aws_caller_identity.current.account_id
  private_subnet_ids   = aws_subnet.private[*].id
}
