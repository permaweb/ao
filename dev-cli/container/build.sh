#!/usr/bin/env bash

cd $(dirname $0)

docker build . -t p3rmaw3b/ao:0.0.34-10GiB
