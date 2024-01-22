resource "aws_ssm_parameter" "cu_ami_id" {
  count = var.enabled ? 1 : 0
  name  = "cu-ami-id"
  type  = "String"
  value = "dummy"

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [value]
  }
}
