#!/usr/bin/env bash

set -ex

C="http.upload"

docker rm -f ${C} || echo
docker build -t ${C} .
docker run \
  -v "$(pwd)"/www:/var/www \
  --name ${C} \
  -d \
  -p 3000:3000 \
  ${C}

docker logs -f ${C}
