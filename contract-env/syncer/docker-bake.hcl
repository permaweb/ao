variable "TAG" {
  default = "dev"
}

group "default" {
  targets = ["syncer-release"]
}

target "syncer-dev" {
  dockerfile = "Dockerfile"
  tags = ["docker.io/warpredstone/syncer:${TAG}", "docker.io/warpredstone/syncer:latest"]
}

target "syncer-release" {
  inherits = ["syncer-dev"]
  platforms = ["linux/amd64", "linux/arm64"]
}