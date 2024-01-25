packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = "~> 1"
    }
  }
}

locals {
  server      = "su"
  environment = "testnet"
  timestamp   = regex_replace(timestamp(), "[- TZ:]", "")
  subnet_id   = "subnet-0e5ca832b3d1df22e" # Public subnet 1
}

data "amazon-ami" "alpine-current" {
  filters = {
    name                = "*alpine-3.19.0-x86_64-uefi-cloudinit*"
    root-device-type    = "ebs"
    virtualization-type = "hvm"
    architecture        = "x86_64"
  }
  most_recent = true
  owners      = ["538276064493"]
  region      = "us-west-1"
}


source "amazon-ebs" "su-testnet" {
  ami_name      = "${local.server}-${local.environment}-${local.timestamp}"
  instance_type = "t3.small"
  subnet_id     = local.subnet_id

  source_ami            = "${data.amazon-ami.alpine-current.id}"
  ssh_username          = "alpine"
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

  provisioner "file" {
    destination = "/tmp/"
    source      = "../../servers/su/su"
  }

  provisioner "shell" {
    inline = [
      "mv /tmp/su /home/alpine/su",
      "chmod +x /home/alpine/su",
      "doas apk update",
      "doas apk add aws-cli bash curl"
    ]
  }
}
