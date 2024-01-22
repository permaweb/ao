variable "enabled" {
  description = "if this module should be enabled"
  type        = bool
}

variable "environment" {
  description = "environment name"
  type        = string
}

variable "region" {
  description = "aws-region"
  type        = string
}

variable "vpc_id" {
  description = "vpc id"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "list of public subnet cidrs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "list of public subnet ids"
  type        = list(string)
}

variable "ec2_instance_type" {
  description = "ec2 instance type"
  type        = string
  default     = "t4g.large"
}

variable "ao_wallet_arn" {
  description = "The ARN of the AWS Secrets Manager secret that contains the AO wallet json string"
  type        = string
}
