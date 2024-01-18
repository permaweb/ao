resource "aws_ssm_parameter" "cu_ecr_image_revision" {
  count = var.enabled ? 1 : 0
  name  = "cu-ecr-image-revision"
  type  = "String"
  value = "dummy"

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [value]
  }
}
