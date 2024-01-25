#!/usr/bin/env bash

set -x

mkdir -p /home/alpine/.ssh

### add public keys here for ssh access
echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDlLrOkb6n8oBCkX1uF4P5WZNaWfw0JzvSFwXvUo7vjcabWoGc3FZ6WdHni1za/Z61YxALp9vk5rJsRmEIzcqjqNPUpMyj34YvwkIqdSYJ1uv2Wg4Zh+gblMak8pbVmAlb5v/3LKQz6ltumRZwJ67CJjBXqrYyurmpLx08DiGLLVf/pDfayisKiZ1h+bsbcipWboCfCii7F+G4ivoLKevMkkg3wpvOFqcwxMryq2x4zFxBksaAMDNWvV68AuVEaSYpHHTolIY7+40fk6aS1Z5X8wFmf6XaX8e1LjuVGXY3H4i4NVa/hCrBrrBBT0y6N9MTNoZKNoVx0FRpuGPGUmtrlne41Hbx1X/qUIjhjR6kHPPuGqWzNWC38E2ofIY6o9TQynC9xVt89M5k0nFmcJ2SUZxJoXa1tLG0ImF0mirNRQutV2/nhj6mjrd73OAckFRazHAhkFaYFzAOWdbg8ZGp+k9q2y1JWRfWq2V2ClOLp+iW4DYrzQDVQssM2zTyDLaVBHVUxSb6JPsQnl4jE05uRMGVpQNId6h2DoNN6Z0xdb4j0nYpvDOkDqPU5Y3QAtHbXQs41MB3yfkNFFKtRrcOVJW7Qi+C2DO4U00zuhkmgiiSNdixOKn+dDdc9NZ4OfhOkgqYf8h0cx/nGX+aHcN+mgqMmRpBoFwCMnCtET6GcAw== hlolli@gmail.com' >> /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/alpine/.ssh/authorized_keys
chown alpine:alpine /home/alpine/.ssh/authorized_keys

cd /home/alpine

aws secretsmanager get-secret-value --region us-west-1 --secret-id ao-wallet --query SecretString --output text > .wallet

export SU_WORKER_NUMBER=1

cat <<EOF > /etc/init.d/su
#!/sbin/openrc-run

user="root"
group="root"
command="/usr/bin/env"
directory="/home/alpine"
command_args="GATEWAY_URL=${gateway_url} UPLOAD_NODE_URL=${upload_node_url} MODE=su SU_WALLET_PATH=/home/alpine/.wallet SCHEDULER_LIST_PATH='' DATABASE_URL=${postgres_writer_instance}/su$SU_WORKER_NUMBER /home/alpine/su su ${application_port}"
command_user="\$${user}:\$${group}"
command_background="yes"
pidfile="/run/\$${RC_SVCNAME}.pid"
output_log="/var/log/\$${RC_SVCNAME}.log"
error_log="\$${output_log}"

depend() {
	use net
}
EOF

chmod +x /etc/init.d/su

rc-service su start