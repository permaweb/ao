include {
  path = find_in_parent_folders()
}

terraform {
  source = "../..//src"
}

inputs = {
  environment = "testnet"
  region      = "us-west-1"
  azs         = ["us-west-1a", "us-west-1c"]
  account_id  = "429478883069"
  vpc_cidr    = "12.25.0.0/16"

  private_subnets_cidr = ["12.25.1.0/24", "12.25.3.0/24"]
  public_subnets_cidr  = ["12.25.0.0/24", "12.25.2.0/24"]
}