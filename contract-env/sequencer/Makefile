PACKAGE  = sequencer
GOROOT   = $(CURDIR)/.gopath~
GOPATH   = $(CURDIR)/.gopath~
BIN      = $(GOPATH)/bin
BASE     = $(GOPATH)/cmd/sequencerd
PATH    := bin:$(PATH)
GO       = go
VERSION ?= $(shell git describe --tags --always --match=v* 2> /dev/null || \
			cat $(CURDIR)/.version 2> /dev/null || echo v0)
DATE    ?= $(shell date +%FT%T%z)

export GOPATH

# Display utils
V = 0 # Verbose output, change to 1 to print commands
Q = $(if $(filter 1,$V),,@) # Conditionally print output
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
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v1.53.3

GENTOOL = $(BIN)/gentool
$(BIN)/gentool: REPOSITORY=gorm.io/gen/tools/gentool@latest

.PHONY: lint
lint: $(GOLANGCILINT) | $(BASE) ; $(info $(M) running golangci-lint) @
	$Q $(GOLANGCILINT) run 

.PHONY: version
version:
	$Q echo -n $(VERSION) > .version

.PHONY: clean
clean:
	rm -rf bin/$(PACKAGE) .gopath~

# Build targets
.PHONY: build
build:  | $(BASE); $(info $(M) building executable…) @
	$Q cd $(BASE) && $(GO) build \
		-tags release \
		-o bin/$(PACKAGE) cmd/sequencerd/main.go

.PHONY: build-race
build-race:  | $(BASE); $(info $(M) building executable…) @
	$Q cd $(BASE) && $(GO) build -race \
		-tags release \
		-o bin/$(PACKAGE) main.go

.PHONY: test
test:
	$(GO) test ./...

.PHONY: docker-build
docker-build: all | ; $(info $(M) building docker container) @ 
	$(GO) mod vendor
	DOCKER_BUILDKIT=0 docker build -t "warpredstone/sequencer:latest" .
	# DOCKER_BUILDKIT=0 docker build -t "warpredstone/sequencer:$(VERSION)" .
	rm -rf vendor
	docker images --filter label=stage=sequencer-builder -q | tail -n +2 | xargs docker image rm

.PHONY: docker-push
docker-push: all | ; $(info $(M) building docker container) @ 
	$(GO) mod vendor
	DOCKER_BUILDKIT=0 TAG=$(VERSION) docker buildx bake -f docker-bake.hcl --push
	rm -rf vendor

.PHONY: docker-run
docker-run: docker-build | ; $(info $(M) running docker container) @ 
	docker compose --profile sequencer up 