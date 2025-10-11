# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`ao` is an actor-oriented computing machine that runs on the Arweave network. It provides a distributed, hyper-parallel compute environment where processes communicate through message passing. The repository is a monorepo containing client libraries, server implementations (Units), and development tools.

## Key Projects

- **connect** (`@permaweb/aoconnect`): JavaScript library for spawning, evaluating, and interacting with ao Processes (browser + node)
- **loader** (`@permaweb/ao-loader`): JavaScript loader for invoking ao Contracts (compiled to WASM) from JavaScript
- **dev-cli**: Deno-based CLI for initializing, building, running, and publishing Lua/C → WASM contracts
- **servers/cu**: Compute Unit (CU) - evaluates ao process messages and maintains process state
- **servers/mu**: Messenger Unit (MU) - handles message routing and delivery between processes
- **servers/su**: Scheduler Unit (SU) - schedules messages for processes
- **servers/ur**: Unit Router (UR) - reverse proxy for ao Units
- **scheduler-utils**: Shared utilities for scheduler operations
- **protocol-tag-utils**: Shared utilities for protocol tag handling

## Development Commands

### Root Level
```bash
npm i                    # Install root dependencies (sets up git hooks)
npm run fmt              # Format code with StandardJS
npm run staged           # Run lint-staged
```

### Connect (`./connect`)
```bash
npm i                    # Install dependencies
npm run build            # Build types and source (esbuild)
npm test                 # Run unit tests (node --test)
npm run test:integration # Run e2e integration tests
```

### Loader (`./loader`)
```bash
npm i                    # Install dependencies
npm run build            # Build types and source (esbuild)
npm test                 # Run tests with WASM memory64 support
```

### Dev CLI (`./dev-cli`)
Requires Docker installed.
```bash
deno task build-binaries # Compile CLI binaries for all platforms
deno task install-local  # Install binary from dist/ for local dev
```

Installing the CLI:
```bash
curl -L https://install_ao.g8way.io | bash
```

Using the CLI:
```bash
ao init [project]        # Initialize new Lua/C project
ao lua                   # Launch Lua REPL
ao run [file.lua]        # Execute Lua file
ao build                 # Compile Lua/C to WASM
ao publish [file.wasm] -w [wallet] # Publish WASM to Arweave
```

### Compute Unit (`./servers/cu`)
```bash
npm i                        # Install dependencies
npm start                    # Start server (requires .env with WALLET)
npm run dev                  # Start with hot-reload
npm test                     # Run unit tests (requires --experimental-wasm-memory64)
npm run lint                 # Lint with StandardJS
```
Server runs on port 6363 by default. Requires Node >=18 (Node 22 for >4GB WASM memory).

### Messenger Unit (`./servers/mu`)
```bash
npm i                        # Install dependencies
npm start                    # Start server (requires .env)
npm run dev                  # Start with hot-reload
npm test                     # Run unit tests
```
Server runs on port 3005 by default.

## Architecture Patterns

### Ports and Adapters (Hexagonal Architecture)

Both the CU and MU follow Ports and Adapters architecture:

```
Driving Adapter (HTTP/Routes) <--> [Port(Business Logic)Port] <--> Driven Adapter (Effects/Side-effects)
```

**Business Logic Layer** (`src/domain`):
- Core business logic in `domain/lib`
- Public APIs exposed via `domain/api/*.js`
- Unit tested and side-effect free
- Contract definitions in `dal.js` define driven adapter interfaces

**Driven Adapters** (`src/effects` in CU, side-effect implementations in MU):
- Implement contracts from `dal.js`
- Handle external integrations (Arweave, GraphQL, file system, etc.)
- Dependency-injected into business logic

**Entrypoint** (`bootstrap.js` or similar):
- Wires up implementations from effects
- Injects into business logic APIs
- Configures the application

**Routes** (`src/routes`):
- Driving adapters that expose HTTP endpoints
- Use function composition for middleware behavior
- Business logic injected via `withDomain.js` middleware (CU) or similar patterns
- Routes receive `req.domain` with config and business logic APIs

### Connect Library Architecture

The `connect` library also follows Ports and Adapters:

- **Business logic**: `lib/` directory contains pure functions
- **Contracts**: `dal.js` defines driven adapter contracts
- **Client implementations**: `client/` contains platform-specific implementations (node, browser)
- **Entrypoints**: `index.js` (node) and `index.browser.js` (browser) wire everything together

Contract wrapping in business logic ensures unit test stubs accurately implement contracts, making unit tests simultaneously contract tests.

### Stratified Design

Code follows stratified design principles:
- Separate business logic from side-effects and services
- Lift business logic from imperative constructs
- Create clear layers of abstraction
- Each layer should be consistent within itself

## Code Style and Standards

### JavaScript Style
- **StandardJS**: All JavaScript follows [StandardJS](https://standardjs.com/) style
- **Formatting**: Use `npm run fmt` at root to auto-fix
- **Linting**: Git hooks enforce style automatically via `lint-staged`
- **Functional approach**: Prefer functional programming patterns (using `ramda`)
- **Dependency injection**: Use for testability and separation of concerns

### Commit Messages
- **Format**: Follow [Conventional Commits](https://www.conventionalcommits.org/)
- **Scope**: Must reference project in scope (e.g., `feat(cu):`, `fix(connect):`, `chore(mu):`)
- **Issue reference**: Include issue number (e.g., `feat(cu): implement feature #123`)
- **Imperative mood**: Use imperative verbs ("Add", "Fix", "Update")
- Git hooks enforce commit message format via `commitlint`

Valid scopes: `cu`, `mu`, `su`, `ur`, `connect`, `loader`, `dev-cli`, `scheduler-utils`, `protocol-tag-utils`

### Dependencies
- **Scrutinize dependencies**: External dependencies should have specific purpose
- **Prefer web standards**: Use standard APIs (e.g., `fetch` over `axios`)
- **Consistency**: Use one tool per purpose per project (e.g., `ramda` OR `lodash`, not both)
- **Node requirement**: Most projects require Node >=18

## Testing

### Unit Tests
- Use Node's built-in test runner (`node --test`)
- Focus on business logic, not implementation details
- Test according to interface, not implementation
- Mock/stub driven adapters (side-effects)
- Tests should not change if implementation changes but API stays same
- Number of tests should scale with: number of inputs, outputs, and branches

### Integration Tests
- Connect has e2e tests in `test/e2e/`
- Run with `npm run test:integration` after building

### Test Coverage
Tests should be efficient and effective - write tests that validate behavior, not lines of code.

## Project-Specific Notes

### Environment Variables
Each server has its own `.env` file. See `.env.example` in each project directory.

**Critical CU Variables**:
- `WALLET` or `WALLET_FILE`: Required - JWK interface or path to wallet file
- `PORT`: Server port (default: 6363)
- `GATEWAY_URL`: Arweave gateway (default: https://arweave.net)
- `GRAPHQL_URL`: Arweave GraphQL endpoint
- `DB_MODE`: `embedded` or `remote` (default: `embedded`)

**Critical MU Variables**:
- `PORT`: Server port (default: 3005)
- `CU_URL`: Compute Unit URL (default: http://localhost:6363 in dev)
- `PATH_TO_WALLET`: Path to wallet JWK interface
- `GATEWAY_URL`: Arweave gateway

### WASM and Memory
- **CU requires** `--experimental-wasm-memory64` flag for Node
- **Memory limits**: CU supports up to 1GB by default (`PROCESS_WASM_MEMORY_MAX_LIMIT`)
- **Node 22**: Required for >4GB process memory
- **Loader tests**: Also require `--experimental-wasm-memory64` flag

### Debug Logging
**Connect**:
- Set `DEBUG=@permaweb/aoconnect*` (Node) or `localStorage.debug` (Browser)
- Use wildcards to filter: `@permaweb/aoconnect/result*`

**MU**:
- Set `DEBUG=ao-mu*` for verbose logs

**CU**:
- Uses Winston with RFC5424 severity levels (error, warn, info, http, verbose, debug, silly)
- Set `DEFAULT_LOG_LEVEL` environment variable
- Dynamically change log level by writing to `.loglevel` file or `LOG_CONFIG_PATH`

### Checkpointing (CU)
- Checkpoint configuration via env vars (`PROCESS_CHECKPOINT_CREATION_THROTTLE`, etc.)
- Manually trigger with `kill -USR2 <process_id>`
- File checkpoints persist across restarts

### Module Format
- CU supports `wasm32-unknown-emscripten` and `wasm32-unknown-emscripten2` by default
- Configure via `PROCESS_WASM_SUPPORTED_FORMATS` and `PROCESS_WASM_SUPPORTED_EXTENSIONS`

## Contributing Workflow

1. **Assign yourself** an issue from GitHub
2. **Make changes** following standards above
3. **Test thoroughly**: Unit tests + manual testing
4. **Ensure all checks pass**: lint, build, test
5. **Write clear commit messages** with conventional commits format
6. **Open Pull Request**:
   - Describe changes and reference issue
   - Add reviewers if needed (see CONTRIBUTING.md for when to request review)
   - Ensure all automated checks pass
   - Resolve merge conflicts
   - You are responsible for merging your PR
7. **Delete feature branch** after merge

### When to Request Code Review
- Changes in unfamiliar areas
- Implementing group-agreed designs
- Changes to integral parts (env vars, fundamental models)
- Major dependency updates
- Changes to legacy code
- Removing public functionality

### No Estimates
- Issues should take ≤3 business days (ideally 1 day)
- No formal estimation process
- Asynchronous, frictionless workflow
- Check GitHub Issues for project state

## License
BSL 1.1 during testnet phase. Will transition to evolutionary forking license or traditional OSS license post-testnet.
