resource "aws_dynamodb_table" "su_assignments_lock" {
  name           = "su-assignments-lock"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "AssignmentNumber"

  attribute {
    name = "AssignmentNumber"
    type = "N"
  }
}
