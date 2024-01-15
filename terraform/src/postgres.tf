data "aws_rds_cluster" "rds_postgres_cluster" {
  cluster_identifier = "ao-${var.environment}"
}

resource "aws_security_group" "postgres_security_group" {
  name        = "Postgres security group"
  description = "Allow inbound traffic"
  vpc_id      = aws_vpc.default.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    # uncomment to limit to private subnets
    # cidr_blocks = concat(aws_subnet.private[*].cidr_block, aws_subnet.public[*].cidr_block)
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}
