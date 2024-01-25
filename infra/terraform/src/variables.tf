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

variable "azs" {
  type        = list(string)
  description = "list of availability zones"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the default VPC"
}

variable "private_subnets_cidr" {
  type        = list(string)
  description = "CIDR blocks for the private subnets"
}

variable "public_subnets_cidr" {
  type        = list(string)
  description = "CIDR blocks for the public subnets"
}

variable "su_unit_count" {
  type        = number
  description = "Number of su units"
}

variable "su_unit_count_max" {
  type        = number
  description = "Maximum number of su units"
}
