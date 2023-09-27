# `ao` SDK Test Harnesses

Some tests for verifying `@permaweb/ao-sdk` works in various environments

<!-- toc -->

- [Getting Started](#getting-started)
- [Background](#background)
  - [Relevant Code](#relevant-code)

<!-- tocstop -->

## Getting Started

`npm run test:integration` from the root will build the SDK and link it using
`npm link`. Then it will run the integration tests for each environment:

- Node CJS
- Node ESM
- Browser (TODO)

You can run `npm i && npm test` from here as well, but you must first build the
SDK at the root of the project using `npm run build`

## Background

`@permaweb/ao-sdk` is developed as a Node ESM module, and is then built to
various targets ie. Node `esm` and `cjs` Browser `esm` and `cjs` using
[esbuild](https://esbuild.github.io/).

Part of the build process involves aliasing Node friendly modules for their
browser friendly versions. For example, with PouchDB, we need to use the Browser
friendly Storage adapter. For Arweave Wallets, we need to use the Browser
friendly `window.arweaveWallet`

There are a lot of moving parts, so we have a couple things to test:

- Integration test to ensure `@permaweb/ao-sdk` can be used in a Node ESM
  project (`type: "module"`)
- Integration test to ensure `@permaweb/ao-sdk` can be used in a Node CJS
  project (`type: "commonjs"`)
- (TODO) Integration test to ensure `@permaweb/ao-sdk` can be used in a Browser ESM
  project (ie. Svelte + Vite)
- (TODO) Integration test to ensure `@permaweb/ao-sdk` can be used in a Browser CJS
  project (ie. NextJS)

### Relevant Code

Each environment is a Node project that includes the `@permaweb/ao-sdk` as a
dependency. This is to ensure the build output targets are working as expected.

All of the harnesses use `npm link` to link their `@permaweb/ao-sdk` dependency
to the built output (`dist`) at the root of the `@permaweb/ao-sdk` module. This
is to help ensure module loading is working correctly for each respective
harness.
