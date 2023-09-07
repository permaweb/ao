# AO SDK

This sdk will run in a browser or server environment, the purpose is to manage
ao smart contracts state evaluation.

The sdk consists of two dependencies:

- @permaweb/ao-loader - loads and evaluates the contract source in a secure wasm
  environment
- PouchDb and browser/server database to store the interactions of each contact,
  as well as the state snapshots
