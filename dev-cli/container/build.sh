#!/bin/sh

docker build -t p3rmaw3b/ao:dev -f Dockerfile .
docker build -t p3rmaw3b/ao:webgpu-sync -f Dockerfile.webgpu-sync .
