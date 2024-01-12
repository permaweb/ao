terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.32.0"
    }
  }

  backend "s3" {
    bucket         = "terraform-state-project-ao-production"
    key            = "terragrunt.tfstate"
    region         = "us-west-1"
    dynamodb_table = "ao-production-terraform-state-lock"
  }

}

resource "aws_s3_bucket" "terraform_states_storage" {
  bucket = "terraform-state-project-ao-production"
}

resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "ao-production-terraform-state-lock"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}
