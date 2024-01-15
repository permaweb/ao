resource "aws_ecs_cluster" "mu_cluster" {
  count = var.enabled ? 1 : 0
  name  = "mu-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "mu_cluster" {
  count = var.enabled ? 1 : 0
  name  = "/ecs/mu-cluster"
}

resource "aws_ecs_task_definition" "mu_task" {
  count  = var.enabled ? 1 : 0
  family = "mu"

  requires_compatibilities = [
    "FARGATE",
  ]

  execution_role_arn = aws_iam_role.mu_fargate_role.0.arn
  task_role_arn      = aws_iam_role.mu_task_role.0.arn
  network_mode       = "awsvpc"
  cpu                = 512
  memory             = 1024

  container_definitions = jsonencode([
    {
      name        = "mu-task-definition"
      image       = "${aws_ecr_repository.mu_ecr.0.repository_url}:${aws_ssm_parameter.mu_ecr_image_revision.0.value}"
      essential   = true
      environment = var.ecs_environment_variables
      logConfiguration : {
        logDriver : "awslogs"
        options : {
          awslogs-group : aws_cloudwatch_log_group.mu_cluster.0.name
          awslogs-region : var.region
          awslogs-stream-prefix : "ecs"
        }
      }
    }
  ])
}

resource "aws_security_group" "mu_ecs_security_group" {
  count       = var.enabled ? 1 : 0
  name        = "MU Security Group"
  description = "MU Security Group"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

}

resource "aws_ecs_service" "mu_service" {
  count           = var.enabled ? 1 : 0
  name            = "mu-service"
  cluster         = aws_ecs_cluster.mu_cluster.0.id
  task_definition = aws_ecs_task_definition.mu_task.0.arn
  desired_count   = 1

  network_configuration {
    security_groups = [aws_security_group.mu_ecs_security_group.0.id]
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
