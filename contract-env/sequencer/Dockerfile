# Build the sequencer binary
FROM golang:1.20.3-alpine3.17 as sequencer
LABEL stage=sequencer-builder
RUN apk add --update make build-base curl git

RUN go install cosmossdk.io/tools/cosmovisor/cmd/cosmovisor@latest

WORKDIR /app
COPY .gopath~ .gopath~
COPY Makefile .
COPY go.mod .
COPY go.sum .
COPY app app
COPY crypto crypto
COPY docs docs
COPY tools tools
COPY x x
COPY cmd cmd
COPY testutil testutil
COPY .git .git

RUN make build

# Minimal output image
FROM alpine:3.17

# Cosmovisor setup
RUN mkdir -p /root/cosmovisor/genesis/bin

# Cosmos setup
RUN mkdir -p /root/.sequencer/data
RUN echo '{"height":"0","round":0,"step":0}' > /root/.sequencer/data/priv_validator_state.json

# Executables
COPY --from=sequencer /go/bin/cosmovisor /usr/local/bin/cosmovisor
COPY --from=sequencer /app/bin/sequencer /root/cosmovisor/genesis/bin/sequencer
COPY utils/docker-entrypoint.sh /app/docker-entrypoint.sh

# Configs are small, so we can just copy them
COPY network network

ENTRYPOINT [ "/app/docker-entrypoint.sh" ]