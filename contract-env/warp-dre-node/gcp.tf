# This code is compatible with Terraform 4.25.0 and versions that are backwards compatible to 4.25.0.
# For information about validating this Terraform code, see https://developer.hashicorp.com/terraform/tutorials/gcp-get-started/google-cloud-platform-build#format-and-validate-the-configuration

resource "google_compute_instance" "dre-docker-1" {
  boot_disk {
    auto_delete = true
    device_name = "dre-docker-ppe"

    initialize_params {
      image = "projects/debian-cloud/global/images/debian-11-bullseye-v20221206"
      size  = 120
      type  = "pd-ssd"
    }

    mode = "READ_WRITE"
  }

  can_ip_forward      = false
  deletion_protection = false
  enable_display      = false

  labels = {
    ec-src = "vm_add-tf"
  }

  machine_type = "n2d-custom-8-16384"

  metadata = {
    startup-script = "#!/bin/bash -ex\nexec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1\necho BEGIN\nsudo apt-get update\nsudo apt-get install -y \\\n    ca-certificates \\\n    curl \\\n    wget \\\n    gnupg \\\n    lsb-release\nsudo mkdir -p /etc/apt/keyrings\ncurl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg\necho \\\n\"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \\\n  $(lsb_release -cs) stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null\nsudo apt-get update\nsudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin\n\nsudo useradd -g docker -s /bin/bash -m dre"
  }

  name = "dre-docker-1"

  network_interface {
    access_config {
      network_tier = "PREMIUM"
    }

    subnetwork = "projects/warp-372209/regions/us-central1/subnetworks/default"
  }

  scheduling {
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
    preemptible         = false
    provisioning_model  = "STANDARD"
  }

  service_account {
    email  = "890342139507-compute@developer.gserviceaccount.com"
    scopes = ["https://www.googleapis.com/auth/devstorage.read_only", "https://www.googleapis.com/auth/logging.write", "https://www.googleapis.com/auth/monitoring.write", "https://www.googleapis.com/auth/service.management.readonly", "https://www.googleapis.com/auth/servicecontrol", "https://www.googleapis.com/auth/trace.append"]
  }

  shielded_instance_config {
    enable_integrity_monitoring = true
    enable_secure_boot          = false
    enable_vtpm                 = true
  }

  tags = ["http-server", "https-server"]
  zone = "us-central1-a"
}
