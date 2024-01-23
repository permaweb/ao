packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = "~> 1"
    }
  }
}

locals {
  server      = "cu"
  environment = "testnet"
  timestamp   = regex_replace(timestamp(), "[- TZ:]", "")
  subnet_id   = "subnet-0e5ca832b3d1df22e" # Public subnet 1
}

data "amazon-ami" "ubuntu-latest" {
  filters = {
    name                = "ubuntu/images/*ubuntu-jammy*"
    root-device-type    = "ebs"
    virtualization-type = "hvm"
    architecture        = "arm64"
  }
  most_recent = true
  owners      = ["amazon"]
  region      = "us-west-1"
}


source "amazon-ebs" "cu-testnet" {
  ami_name      = "${local.server}-${local.environment}-${local.timestamp}"
  instance_type = "t4g.large"
  subnet_id     = local.subnet_id

  // launch_block_device_mappings {
  //   delete_on_termination = true
  //   device_name           = "/dev/xvda"
  //   volume_size           = 20
  //   volume_type           = "gp2"
  // }

  source_ami            = "${data.amazon-ami.ubuntu-latest.id}"
  ssh_username          = "ubuntu"
  force_deregister      = true
  force_delete_snapshot = true

  tags = {
    Name = "${local.server}-${local.environment}-${local.timestamp}"
  }
}

build {
  sources = [
    "source.amazon-ebs.${local.server}-${local.environment}"
  ]

  provisioner "shell-local" {
    command = "tar -C ../../servers -cf toupload/sources.tar --exclude \"node_modules\" --exclude \".env\" cu"
  }

  provisioner "file" {
    destination = "/tmp/"
    source      = "./toupload"
  }

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      # https://serverfault.com/a/1087736
      "sudo apt-get update",
      "sudo apt-get install -y bash build-essential git apt-utils curl apt-transport-https gnupg",
      "sudo snap install aws-cli --classic",
      "curl -O https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/arm64/latest/amazon-cloudwatch-agent.deb",
      "sudo dpkg -i -E ./amazon-cloudwatch-agent.deb",
      "sudo snap switch --channel=candidate amazon-ssm-agent",
      "curl -sL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh",
      "sudo bash /tmp/nodesource_setup.sh",
      "sudo apt-get install -y nodejs",
      "cd /home/ubuntu && tar xf /tmp/toupload/sources.tar",
      "rm /tmp/toupload/sources.tar",
      "cd /home/ubuntu/cu && npm install"
    ]
  }
}
