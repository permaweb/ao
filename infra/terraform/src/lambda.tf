data "archive_file" "slack_lambda_handler" {
  type        = "zip"
  source_file = "${path.module}/lambda-functions/slack_lambda.py"
  output_path = "${path.module}/lambda-functions/dist/slack_lambda_handler.zip"
}


resource "aws_security_group" "slack_lambda_handler" {
  name        = "SlackLambdaHandlerSecurityGroup"
  description = "Allow egress web access"
  vpc_id      = aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "slack_lambda_handler" {
  name              = "/aws/lambda/slack-lambda-handler"
  retention_in_days = 14
}


resource "aws_lambda_function" "slack_lambda_handler" {
  function_name = "slack-lambda-handler"
  handler       = "slack_lambda.lambda_handler"
  filename      = data.archive_file.slack_lambda_handler.output_path
  role          = aws_iam_role.slack_lambda_handler_role.arn
  runtime       = "python3.9"

  source_code_hash = filebase64sha256(data.archive_file.slack_lambda_handler.output_path)


  timeout     = 60
  memory_size = 256

  environment {
    variables = {
    }
  }

  vpc_config {
    subnet_ids = aws_subnet.private.*.id
    security_group_ids = [
      aws_security_group.slack_lambda_handler.id
    ]
  }

}

# resource "aws_lambda_permission" "arweave_chain_nodes_autoscale_handling" {
#   depends_on = [aws_lambda_function.arweave_chain_nodes_autoscale_handling]

#   statement_id  = "AllowExecutionFromSNS"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.arweave_chain_nodes_autoscale_handling.0.arn
#   principal     = "sns.amazonaws.com"
#   source_arn    = aws_sns_topic.arweave_chain_nodes_autoscale_handling.0.arn
# }
