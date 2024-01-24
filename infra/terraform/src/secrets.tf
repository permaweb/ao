data "aws_secretsmanager_secret" "ao-wallet" {
  arn = "arn:aws:secretsmanager:us-west-1:429478883069:secret:ao-wallet-0gBKzZ"
}

data "aws_secretsmanager_secret" "slackbot-oauth-token" {
  arn = "arn:aws:secretsmanager:us-west-1:429478883069:secret:forward-research-slackbot-oauth-token-eIKSPp"
}
