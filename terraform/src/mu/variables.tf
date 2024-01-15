variable "enabled" {
  description = "if this module should be enabled"
  type        = bool
}

variable "region" {
  description = "aws-region"
  type        = string
}

variable "principal_account_id" {
  type        = string
  description = "The account which is allowed to push to ECR registry"
}

variable "ecs_environment_variables" {
  description = "environment variables for the ECS task"
  type        = list(any)
}

variable "vpc_id" {
  description = "vpc id"
  type        = string

}

variable "private_subnet_ids" {
  description = "list of private subnet ids"
  type        = list(string)
}
