data "archive_file" "assignment_finder" {
  type        = "zip"
  source_file = "${path.module}/lambda/assignment_finder.py"
  output_path = "${path.module}/lambda/dist/assignment_finder.zip"
}


# resource "aws_security_group" "assignment_finder" {
#   name        = "AssignmentFinderSecurityGroup"
#   description = "Allow all web access"
#   vpc_id      = var.vpc_id

#   egress {
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = ["0.0.0.0/0"]
#   }

#   ingress {
#     from_port   = 809
#     to_port     = 809
#     protocol    = "tcp"
#     cidr_blocks = var.public_subnet_cidrs
#   }
# }

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

  source_code_hash = filebase64sha256(data.archive_file.assignment_finder.output_path)


  timeout     = 60
  memory_size = 256

  environment {
    variables = {
    }
  }

  # vpc_config {
  #   subnet_ids = var.private_subnet_ids
  #   security_group_ids = [
  #     aws_security_group.assignment_finder.id
  #   ]
  # }
}

# resource "aws_lambda_function_url" "assignment_finder_url" {
#   function_name      = aws_lambda_function.assignment_finder.function_name
#   authorization_type = "NONE" # secured by VPC+security-groups
# }
