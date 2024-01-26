data "archive_file" "assignment_finder" {
  type        = "zip"
  source_file = "${path.module}/lambda/assignment_finder.py"
  output_path = "${path.module}/lambda/dist/assignment_finder.zip"
}

resource "aws_cloudwatch_log_group" "assignment_finder" {
  name              = "/aws/lambda/assignment-finder"
  retention_in_days = 7
}


resource "aws_lambda_function" "assignment_finder" {
  function_name = "assignment-finder"
  handler       = "assignment_finder.lambda_handler"
  filename      = data.archive_file.assignment_finder.output_path
  role          = aws_iam_role.assignment_finder_role.arn
  runtime       = "python3.9"

  source_code_hash               = filebase64sha256(data.archive_file.assignment_finder.output_path)
  reserved_concurrent_executions = 1


  timeout     = 240
  memory_size = 256

  environment {
    variables = {
      APPLICATION_PORT              = local.application_port
      DDB_SU_ASSIGNMENTS_TABLE_NAME = aws_dynamodb_table.su_assignments_lock.name
      SU_UNIT_COUNT                 = var.su_unit_count
    }
  }
}
