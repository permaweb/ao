resource "aws_route53_zone" "ao_testnet" {
  name = "ao-testnet.xyz"
}

resource "aws_route53_record" "su_records" {
  count   = var.su_unit_count_max
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

resource "aws_route53_record" "rds_writer_cname" {

  zone_id = aws_route53_zone.ao_testnet.id

  name = "psql-writer.${aws_route53_zone.ao_testnet.name}"
  type = "CNAME"
  ttl  = "5"

  records = [data.aws_rds_cluster.rds_postgres_cluster.endpoint]
}

resource "aws_route53_record" "rds_reader_cname" {

  zone_id = aws_route53_zone.ao_testnet.id

  name = "psql-reader.${aws_route53_zone.ao_testnet.name}"
  type = "CNAME"
  ttl  = "5"

  records = [data.aws_rds_cluster.rds_postgres_cluster.reader_endpoint]
}

resource "aws_route53_record" "su_router" {
  zone_id = aws_route53_zone.ao_testnet.id
  name    = "su-router.${aws_route53_zone.ao_testnet.name}"
  type    = "A"

  alias {
    name                   = module.su-router.su_router_asg_cluster_elb_dns_name
    zone_id                = module.su-router.su_router_asg_cluster_elb_zone_id
    evaluate_target_health = true
  }

}
