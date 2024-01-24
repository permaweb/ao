resource "aws_route53_zone" "ao_testnet" {
  name = "ao-testnet.xyz"
}

resource "aws_route53_record" "su_records" {
  count   = var.su_unit_count
  zone_id = aws_route53_zone.ao_testnet.zone_id
  name    = "su${count.index + 1}.ao-testnet.xyz"
  type    = "A"
  ttl     = "5"
  records = ["0.0.0.0"] # DUMMY

  lifecycle {
    ignore_changes = [
      records # that's why dummy above
    ]
  }
}
