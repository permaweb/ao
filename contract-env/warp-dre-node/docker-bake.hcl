variable "TAG" {
  default = "dev"
}

group "default" {
  targets = ["dre-release"]
}

target "dre-dev" {
  dockerfile = "Dockerfile"
  tags = ["docker.io/warpredstone/dre:${TAG}"]
}

target "dre-release" {
  inherits = ["dre-dev"]
  platforms = ["linux/amd64", "linux/arm64"]
}
