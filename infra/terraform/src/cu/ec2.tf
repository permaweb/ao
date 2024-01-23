resource "aws_security_group" "cu_asg_cluster" {
  count       = var.enabled ? 1 : 0
  name        = "cu-asg-cluster-sg"
  description = "Allow inbound traffic from the internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow inbound SSH in the private VPC"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound traffic to the internet"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "cu_asg_cluster_log_group" {
  count = var.enabled ? 1 : 0
  name  = "/ec2/cu-asg-cluster"
}

resource "aws_launch_template" "cu_asg_cluster_launch_template" {
  count         = var.enabled ? 1 : 0
  name          = "cu-asg-cluster"
  image_id      = aws_ssm_parameter.cu_ami_id.0.value
  instance_type = var.ec2_instance_type

  network_interfaces {
    security_groups = [aws_security_group.cu_asg_cluster.0.id]
  }

  monitoring {
    enabled = true
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.cu_task_profile.0.name
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    region         = var.region
    log_group_name = aws_cloudwatch_log_group.cu_asg_cluster_log_group.0.name
  }))

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 50
      volume_type           = "gp2"
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = tomap({
      AoEnvironment = var.environment,
      AoServer      = "cu"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = tomap({
      AoEnvironment = var.environment,
      AoServer      = "cu"
    })
  }

  tags = tomap({
    AoEnvironment = var.environment,
    AoServer      = "cu"
  })

}

resource "aws_elb" "cu_asg_cluster_elb" {
  count              = var.enabled ? 1 : 0
  availability_zones = var.azs

  health_check {
    target              = "HTTP:80/"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
  }

  listener {
    instance_port     = 80
    instance_protocol = "HTTP"
    lb_port           = 80
    lb_protocol       = "HTTP"
  }

}

resource "aws_autoscaling_group" "cu_asg_cluster" {
  count = var.enabled ? 1 : 0
  enabled_metrics = [
    "GroupDesiredCapacity",
    "GroupPendingInstances",
    "GroupInServiceInstances",
    "GroupTerminatingInstances",
    "GroupTotalInstances"
  ]

  # load_balancers = [aws_elb.cu_asg_cluster_elb.0.name]

  name                      = "cu-asg-cluster"
  desired_capacity          = 1
  max_size                  = 1
  min_size                  = 0
  vpc_zone_identifier       = var.public_subnet_ids
  health_check_type         = "ELB"
  health_check_grace_period = 300
  wait_for_capacity_timeout = 0

  tag {
    key                 = "Name"
    value               = "cu-asg-cluster"
    propagate_at_launch = true
  }

  launch_template {
    id      = aws_launch_template.cu_asg_cluster_launch_template.0.id
    version = aws_launch_template.cu_asg_cluster_launch_template.0.latest_version
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [launch_template]
  }

  # initial_lifecycle_hook {
  #   name                    = "lifecycle-launching"
  #   default_result          = "ABANDON"
  #   heartbeat_timeout       = 60
  #   lifecycle_transition    = "autoscaling:EC2_INSTANCE_LAUNCHING"
  #   notification_target_arn = aws_sns_topic.arweave_chain_nodes_autoscale_handling.0.arn
  #   role_arn                = aws_iam_role.arweave_chain_nodes_lifecycle.0.arn
  # }

  # initial_lifecycle_hook {
  #   name                    = "lifecycle-terminating"
  #   default_result          = "ABANDON"
  #   heartbeat_timeout       = 60
  #   lifecycle_transition    = "autoscaling:EC2_INSTANCE_TERMINATING"
  #   notification_target_arn = aws_sns_topic.arweave_chain_nodes_autoscale_handling.0.arn
  #   role_arn                = aws_iam_role.arweave_chain_nodes_lifecycle.0.arn
  # }

  # depends_on = [
  #   aws_lambda_function.arweave_chain_nodes_autoscale_handling
  # ]
}
