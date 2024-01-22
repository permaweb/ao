# couchdb in ECS cluster

locals {
  container_port = 5984
}

# EFS filesystem

resource "aws_efs_file_system" "couchdb_fs" {
  tags = {
    Name = "couchdb"
  }
}

resource "aws_efs_mount_target" "couchdb_fs_mount" {
  file_system_id = aws_efs_file_system.couchdb_fs.id
  subnet_id      = aws_subnet.private[0].id
}

# IAM roles

# resource "aws_iam_role" "couchdb_fargate_role" {
#   name = "couchdb-fargate-role"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Sid    = ""
#         Principal = {
#           Service = [
#             "ecs.amazonaws.com",
#             "ecs-tasks.amazonaws.com",
#             "ec2.amazonaws.com"
#           ]
#         }
#       },
#     ]
#   })
# }

# resource "aws_iam_role_policy" "couchdb_fargate_policy" {
#   name = "couchdb-fargate-policy"
#   role = aws_iam_role.couchdb_fargate_role.id

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "ecr:*"
#         ]
#         Resource = "*"
#       },
#       {
#         Effect = "Allow"
#         Action = [
#           "logs:CreateLogStream",
#           "logs:PutLogEvents"
#         ]
#         Resource = "*"
#       }
#     ]
#   })
# }


# resource "aws_iam_role" "couchdb_task_role" {
#   name = "couchdb-task-role"

#   assume_role_policy = <<EOF
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Action": "sts:AssumeRole",
#       "Principal": {
#         "Service": [
#           "ecs.amazonaws.com",
#           "ecs-tasks.amazonaws.com",
#           "ec2.amazonaws.com"
#         ]
#       },
#       "Effect": "Allow",
#       "Sid": ""
#     }
#   ]
# }
# EOF

#   inline_policy {
#     name = "couchdb-task-role-policy"

#     policy = jsonencode({
#       Version   = "2012-10-17"
#       Statement = []
#     })
#   }
# }

# ECS cluster


# resource "aws_ecs_cluster" "couchdb_cluster" {
#   name = "couchdb-cluster"

#   setting {
#     name  = "containerInsights"
#     value = "enabled"
#   }
# }

# resource "aws_cloudwatch_log_group" "couchdb_cluster" {
#   name = "/ecs/couchdb-cluster"
# }


# resource "aws_ecs_task_definition" "couchdb_task" {
#   family = "couchdb"

#   requires_compatibilities = [
#     "FARGATE",
#   ]

#   execution_role_arn = aws_iam_role.couchdb_fargate_role.arn
#   task_role_arn      = aws_iam_role.couchdb_task_role.arn
#   network_mode       = "awsvpc"
#   cpu                = 512
#   memory             = 1024

#   volume {
#     name = "efs-couchdb"
#     efs_volume_configuration {
#       file_system_id = aws_efs_file_system.couchdb_fs.id
#       root_directory = "/home/couchdb/etc"
#     }
#   }

#   container_definitions = jsonencode([
#     {
#       name        = "couchdb-task-definition"
#       image       = "docker.io/couchdb:3.3.3"
#       essential   = true
#       environment = []
#       portMappings = [
#         {
#           containerPort = local.container_port
#           hostPort      = local.container_port
#         }
#       ]
#       mountPoints = [
#         {
#           containerPath = "/opt/couchdb/etc/local.d",
#           sourceVolume  = "efs-couchdb"
#         }
#       ]

#       logConfiguration : {
#         logDriver : "awslogs"
#         options : {
#           awslogs-group : aws_cloudwatch_log_group.couchdb_cluster.name
#           awslogs-region : var.region
#           awslogs-stream-prefix : "ecs"
#         }
#       }
#     }
#   ])
# }

# resource "aws_security_group" "couchdb_ecs_security_group" {
#   name        = "CouchDB Security Group"
#   description = "CouchDB Security Group"
#   vpc_id      = aws_vpc.default.id

#   ingress {
#     from_port   = local.container_port
#     to_port     = local.container_port
#     protocol    = "tcp"
#     cidr_blocks = aws_subnet.private[*].cidr_block
#   }

#   egress {
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = ["0.0.0.0/0"]
#   }

# }

# resource "aws_ecs_service" "couchdb_service" {
#   name            = "couchdb-service"
#   cluster         = aws_ecs_cluster.couchdb_cluster.0.id
#   task_definition = aws_ecs_task_definition.couchdb_task.0.arn
#   desired_count   = 0

#   network_configuration {
#     security_groups = [aws_security_group.couchdb_ecs_security_group.id]
#     subnets         = aws_subnet.private[*].id
#   }

#   deployment_controller {
#     type = "ECS"
#   }

#   capacity_provider_strategy {
#     base              = 0
#     capacity_provider = "FARGATE"
#     weight            = 100
#   }

# }

