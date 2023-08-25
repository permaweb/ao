PACKAGE  = syncer
IMPORT   = github.com/warp-contracts/syncer
GOROOT   = $(CURDIR)/.gopath~
GOPATH   = $(CURDIR)/.gopath~
BIN      = $(GOPATH)/bin
BASE     = $(GOPATH)/src/$(PACKAGE)
PATH    := bin:$(PATH)
GO       = go
VERSION ?= $(shell git describe --tags --always --match=v* 2> /dev/null || \
			cat $(CURDIR)/.version 2> /dev/null || echo v0)
DATE    ?= $(shell date +%FT%T%z)

export GOPATH

# Display utils
V = 0
Q = $(if $(filter 1,$V),,@)
M = $(shell printf "\033[34;1m▶\033[0m")

# Default target
.PHONY: all
all:  build lint | $(BASE); $(info $(M) built and lint everything!) @

# Setup
$(BASE): ; $(info $(M) setting GOPATH…)
	@mkdir -p $(dir $@)
	@ln -sf $(CURDIR) $@

# External tools 
$(BIN):
	@mkdir -p $@
$(BIN)/%: | $(BIN) ; $(info $(M) installing $(REPOSITORY)…)
	$Q tmp=$$(mktemp -d); \
	   env GO111MODULE=on GOPATH=$$tmp GOBIN=$(BIN) $(GO) install $(REPOSITORY) \
		|| ret=$$?; \
	   exit $$ret

GOLANGCILINT = $(BIN)/golangci-lint
$(BIN)/golangci-lint:
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v1.50.1

GENTOOL = $(BIN)/gentool
$(BIN)/gentool: REPOSITORY=gorm.io/gen/tools/gentool@latest

# Build targets
.PHONY: build
build:  | $(BASE); $(info $(M) building executable…) @
	$Q cd $(BASE) && $(GO) build \
		-tags release \
		-ldflags="-s -w  -X $(IMPORT)/src/utils/build_info.Version=$(VERSION) -X $(IMPORT)/src/utils/build_info.BuildDate=$(DATE)" \
		-o bin/$(PACKAGE) main.go

.PHONY: build-race
build-race:  | $(BASE); $(info $(M) building executable…) @
	$Q cd $(BASE) && $(GO) build -race \
		-tags release \
		-ldflags="-s -w  -X $(IMPORT)/src/utils/build_info.Version=$(VERSION) -X $(IMPORT)/src/utils/build_info.BuildDate=$(DATE)" \
		-o bin/$(PACKAGE) main.go

.PHONY: run
run: build-race | ; $(info $(M) starting app with default params…)
	bin/$(PACKAGE) sync

.PHONY: contract
contract: build-race | ; $(info $(M) starting synchronizing contracts with default params…)
	bin/$(PACKAGE) contract

.PHONY: bundle
bundle: build-race | ; $(info $(M) starting bundling with default params…)
	bin/$(PACKAGE) bundle

.PHONY: check
check: build-race | ; $(info $(M) starting checking with default params…)
	bin/$(PACKAGE) check

.PHONY: forward
forward: build-race | ; $(info $(M) starting forwarding with default params…)
	bin/$(PACKAGE) forward

.PHONY: relay
relay: build-race | ; $(info $(M) starting relaying with default params…)
	bin/$(PACKAGE) relay

.PHONY: gateway
gateway: build-race | ; $(info $(M) starting relaying with default params…)
	bin/$(PACKAGE) gateway

.PHONY: load
load: build-race | ; $(info $(M) starting loading with default params…)
	bin/$(PACKAGE) load

.PHONY: lint
lint: $(GOLANGCILINT) | $(BASE) ; $(info $(M) running golangci-lint) @
	$Q $(GOLANGCILINT) run 

.PHONY: generate
generate: $(GENTOOL) | $(BASE) ; $(info $(M) generating model from the database) @
	$Q $(GENTOOL) -db postgres -dsn "host=127.0.0.1 user=postgres password=postgres dbname=warp port=7654 sslmode=disable" -tables "interactions"

.PHONY: test
test:
	$(GO) test ./...

.PHONY: version
version:
	$Q echo -n $(VERSION) > .version

.PHONY: clean
clean:
	rm -rf bin/$(PACKAGE) .gopath~

.PHONY: logs-sync
logs-sync:
	kubectl logs -f -n syncer-prod deployment/syncer-prod-warp-syncer -c syncer

.PHONY: logs-bundler
logs-bundler:
	kubectl logs -f -n syncer-prod deployment/syncer-prod-warp-syncer -c bundler

.PHONY: logs-check
logs-check:
	kubectl logs -f -n syncer-prod deployment/syncer-prod-warp-syncer -c checker

.PHONY: health
health:
	curl -s http://localhost:3333/v1/health | jq 

.PHONY: docker-build
docker-build: all | ; $(info $(M) building docker container) @ 
	$(GO) mod vendor
	DOCKER_BUILDKIT=0 docker build -t "warpredstone/syncer:latest" .
	DOCKER_BUILDKIT=0 docker build -t "warpredstone/syncer:$(VERSION)" .
	rm -rf vendor

.PHONY: docker-push
docker-push: all | ; $(info $(M) building docker container) @ 
	$(GO) mod vendor
	DOCKER_BUILDKIT=0 TAG=$(VERSION) docker buildx bake -f docker-bake.hcl --push
	rm -rf vendor

.PHONY: docker-run
docker-run: docker-build | ; $(info $(M) running docker container) @ 
	docker compose --profile syncer up syncer