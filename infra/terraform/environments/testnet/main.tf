terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.32.0"
    }
  }

  backend "s3" {
    bucket         = "terraform-state-project-ao-testnet"
    key            = "terragrunt.tfstate"
    region         = "us-west-1"
    dynamodb_table = "ao-testnet-terraform-state-lock"
  }

}

resource "aws_s3_bucket" "terraform_state_bucket" {
  bucket = "terraform-state-project-ao-testnet"
}

resource "aws_dynamodb_table" "tf_state_lock" {
  name           = "ao-testnet-terraform-state-lock"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}
