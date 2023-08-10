# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2020-10-17

### Removed

- The hash function implementations, due to the problematic transitive
  `crypto` and `keccak` package dependencies. These functions will be
  reimplemented differently in a future release.

## [0.1.4] - 2020-10-06

### Added

- The `match()` function.

## [0.1.3] - 2020-10-04

### Added

- Support for `asContract()` on SmartWeave.
- Support for `contractCaller()` on SmartWeave.
- Support for `txSender()` on SmartWeave.

## [0.1.2] - 2020-10-03

### Added

- Support for `blockHeight()` on SmartWeave.

## [0.1.1] - 2020-10-02

### Changed

- Support for both the ESM (`clarity.js`) and CommonJS (`clarity.cjs`)
  module systems.

## 0.1.0 - 2020-09-26

### Added

- The initial public release.

[0.1.5]: https://github.com/weavery/clarity.js/compare/0.1.4...0.1.5
[0.1.4]: https://github.com/weavery/clarity.js/compare/0.1.3...0.1.4
[0.1.3]: https://github.com/weavery/clarity.js/compare/0.1.2...0.1.3
[0.1.2]: https://github.com/weavery/clarity.js/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/weavery/clarity.js/compare/0.1.0...0.1.1
