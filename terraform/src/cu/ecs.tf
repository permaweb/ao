locals {
  container_port = 6363
}

resource "aws_ecs_cluster" "cu_cluster" {
  count = var.enabled ? 1 : 0
  name  = "cu-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "cu_cluster" {
  count = var.enabled ? 1 : 0
  name  = "/ecs/cu-cluster"
}

resource "aws_ecs_task_definition" "cu_task" {
  count  = var.enabled ? 1 : 0
  family = "cu"

  requires_compatibilities = [
    "FARGATE",
  ]

  execution_role_arn = aws_iam_role.cu_fargate_role.0.arn
  task_role_arn      = aws_iam_role.cu_task_role.0.arn
  network_mode       = "awsvpc"
  cpu                = 512
  memory             = 1024

  container_definitions = jsonencode([
    {
      name      = "cu-task-definition"
      image     = "${aws_ecr_repository.cu_ecr.0.repository_url}:${aws_ssm_parameter.cu_ecr_image_revision.0.value}"
      essential = true
      environment = concat(var.ecs_environment_variables, [{
        name  = "PORT"
        value = tostring(local.container_port)
      }])
      portMappings = [
        {
          containerPort = local.container_port
          hostPort      = local.container_port
        }
      ]
      logConfiguration : {
        logDriver : "awslogs"
        options : {
          awslogs-group : aws_cloudwatch_log_group.cu_cluster.0.name
          awslogs-region : var.region
          awslogs-stream-prefix : "ecs"
        }
      }
    }
  ])
}

resource "aws_security_group" "cu_ecs_security_group" {
  count       = var.enabled ? 1 : 0
  name        = "CU Security Group"
  description = "CU Security Group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = local.container_port
    to_port     = local.container_port
    protocol    = "tcp"
    cidr_blocks = var.private_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

}

resource "aws_ecs_service" "cu_service" {
  count           = var.enabled ? 1 : 0
  name            = "cu-service"
  cluster         = aws_ecs_cluster.cu_cluster.0.id
  task_definition = aws_ecs_task_definition.cu_task.0.arn
  desired_count   = 1

  network_configuration {
    security_groups = [aws_security_group.cu_ecs_security_group.0.id]
    subnets         = var.private_subnet_ids
  }

  deployment_controller {
    type = "ECS"
  }

  capacity_provider_strategy {
    base              = 0
    capacity_provider = "FARGATE"
    weight            = 100
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [task_definition]
  }
}
