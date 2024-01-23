#!/usr/bin/env bash

set -x

mkdir -p /home/ubuntu/.ssh

### add public keys here for ssh access
echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDlLrOkb6n8oBCkX1uF4P5WZNaWfw0JzvSFwXvUo7vjcabWoGc3FZ6WdHni1za/Z61YxALp9vk5rJsRmEIzcqjqNPUpMyj34YvwkIqdSYJ1uv2Wg4Zh+gblMak8pbVmAlb5v/3LKQz6ltumRZwJ67CJjBXqrYyurmpLx08DiGLLVf/pDfayisKiZ1h+bsbcipWboCfCii7F+G4ivoLKevMkkg3wpvOFqcwxMryq2x4zFxBksaAMDNWvV68AuVEaSYpHHTolIY7+40fk6aS1Z5X8wFmf6XaX8e1LjuVGXY3H4i4NVa/hCrBrrBBT0y6N9MTNoZKNoVx0FRpuGPGUmtrlne41Hbx1X/qUIjhjR6kHPPuGqWzNWC38E2ofIY6o9TQynC9xVt89M5k0nFmcJ2SUZxJoXa1tLG0ImF0mirNRQutV2/nhj6mjrd73OAckFRazHAhkFaYFzAOWdbg8ZGp+k9q2y1JWRfWq2V2ClOLp+iW4DYrzQDVQssM2zTyDLaVBHVUxSb6JPsQnl4jE05uRMGVpQNId6h2DoNN6Z0xdb4j0nYpvDOkDqPU5Y3QAtHbXQs41MB3yfkNFFKtRrcOVJW7Qi+C2DO4U00zuhkmgiiSNdixOKn+dDdc9NZ4OfhOkgqYf8h0cx/nGX+aHcN+mgqMmRpBoFwCMnCtET6GcAw== hlolli@gmail.com' >> /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys

cat <<EOF > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_root": true,
    "logfile": "/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
  },
  "metrics": {
    "metrics_collected": {
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          "swap_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    },
    "append_dimensions": {
      "ImageId": "\$${aws:ImageId}",
      "InstanceId": "\$${aws:InstanceId}",
      "InstanceType": "\$${aws:InstanceType}"
    },
    "aggregation_dimensions": [
      [
        "InstanceId",
        "InstanceType"
      ]
    ]
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/syslog"
          },
          {
            "file_path": "/var/log/auth.log",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/auth.log"
          },
          {
            "file_path": "/var/log/cloud-init-output.log",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/cloud-init-output.log"
          },
          {
            "file_path": "/var/log/cloud-init.log",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/cloud-init.log"
          },
          {
            "file_path": "/var/log/dmesg",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/dmesg"
          },
          {
            "file_path": "/var/log/kernel.log",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/kernel.log"
          },
          {
            "file_path": "/var/log/aws/code-deploy-agent/codedeploy-agent.log",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/codedeploy-agent.log"
          },
          {
            "file_path": "/var/lib/arweave/logs/arweave@*",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/arweave-service.log"
          }
        ]
      }
    }
  }
}
EOF

systemctl restart amazon-cloudwatch-agent


cd /home/ubuntu/cu

echo 'PORT=6363' >> .env
echo 'NODE_CONFIG_ENV=production' >> .env
echo "WALLET=$(aws secretsmanager get-secret-value --region us-west-1 --secret-id ao-wallet --query SecretString --output text)" >> .env
echo 'DB_MODE="embedded"' >> .env
echo 'GATEWAY_URL="https://arweave.net"' >> .env
echo 'DB_URL="ao-cache"' >> .env
echo 'DB_MAX_LISTENERS=100' >> .env
echo 'DUMP_PATH="static"' >> .env
echo 'NODE_HEAPDUMP_OPTIONS="nosignal"' >> .env

cat <<EOF > /etc/systemd/system/cu.service
[Unit]
After=network-online.target
Wants=network-online.target
Description=CU Service

[Service]
WorkingDirectory=/home/ubuntu/cu
Restart=always
RestartSec=30s
ExecStart=/usr/bin/node -r dotenv/config src/app.js
TimeoutStartSec=30
TimeoutStopSec=30
User=ubuntu
Group=ubuntu
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cu.service
systemctl start cu.service