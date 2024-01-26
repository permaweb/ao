variable "enabled" {
  description = "if this module should be enabled"
  type        = bool
}

variable "su_unit_count" {
  description = "number of su units"
  type        = number
}

variable "su_unit_count_max" {
  description = "maximum number of su units"
  type        = number
}

variable "environment" {
  description = "environment name"
  type        = string
}

variable "region" {
  description = "aws-region"
  type        = string
}

variable "principal_account_id" {
  description = "AWS account id of the target environment"
  type        = string

}

variable "azs" {
  description = "list of availability zones"
  type        = list(string)
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
  default     = "t3.small"
}

variable "ao_wallet_arn" {
  description = "The ARN of the AWS Secrets Manager secret that contains the AO wallet json string"
  type        = string
}

variable "psql_writer_instance_url" {
  description = "The URL of the PSQL writer instance"
  type        = string
}

variable "hosted_zone_id" {
  description = "The ID of the hosted zone"
  type        = string
}

variable "slack_api_token_secret_ami" {
  description = "The slack token"
  type        = string
}
