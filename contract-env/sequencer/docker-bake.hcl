variable "TAG" {
  default = "dev"
}

group "default" {
  targets = ["sequencer-release"]
}

target "sequencer-dev" {
  dockerfile = "Dockerfile"
  tags = ["docker.io/warpredstone/sequencer:${TAG}", "docker.io/warpredstone/sequencer:latest"]
}

target "sequencer-release" {
  inherits = ["sequencer-dev"]
  platforms = ["linux/amd64", "linux/arm64"]
}