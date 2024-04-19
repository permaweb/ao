# process64-5gb tests

This folder can run tests of memory64 WASM modules with more that 4GiB of memory.

<!-- toc -->

- [Info](#info)
- [Requirements](#requirements)
- [Run the tests](#run-the-tests)

<!-- tocstop -->

## Info

The `process.wasm` in this folder was built with a modified version of the `dev-cli` build container to increase the
stack size and maximum memory size.

## Requirements

I was unable to get this working with the latest version of Node (`v21.7.3`), but eventually got it working with a
nightly build of Node: `v22.0.0-nightly2024041907f481cfcf`. Some commands like this may work for you:

```
wget https://nodejs.org/download/nightly/v22.0.0-nightly2024041907f481cfcf/node-v22.0.0-nightly2024041907f481cfcf-darwin-x64.tar.gz
tar-zxf node-v22.0.0-nightly2024041907f481cfcf-darwin-x64.tar.gz
```

## Run the tests

In `5gb.test.mjs`, remove any `.skip` that might skip a test or test suite.

Depending on your node version, run something like this:

```
node-v22.0.0-nightly2024041907f481cfcf-darwin-x64/bin/node --experimental-wasm-memory64 --test 5gb.test.mjs
```
