variable "environment" {
  type        = string
  description = "deployment environment (ex. development, production etc...)"
}

variable "account_id" {
  type        = string
  description = "AWS account id of the target environment"
}

variable "region" {
  type        = string
  description = "aws-region"
}
