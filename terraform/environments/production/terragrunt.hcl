include {
  path = find_in_parent_folders()
}

terraform {
  source = "../..//src"
}

inputs = {
  environment = "production"
  region      = "us-west-1"
  account_id  = "429478883069"
}