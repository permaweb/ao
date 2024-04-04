# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.24](https://github.com/permaweb/ao/compare/loader@v0.0.23...loader@v0.0.24) (2024-04-04)


### Features

* [wip] working on modifying loader api to accept multiple formats ([63bbd35](https://github.com/permaweb/ao/commit/63bbd35df4a491948d2438735625662e5b30a683))
* **loader:** add new module format to support sqlite with aos ([6ff5837](https://github.com/permaweb/ao/commit/6ff583772289b11760bc85a310dbe1919c7fd67a))
* reverted container to use emscripten Os ([9ea1ec7](https://github.com/permaweb/ao/commit/9ea1ec7a155894de98d5084731bc1c25f20afd41))

## [0.0.23](https://github.com/permaweb/ao/compare/loader@v0.0.22...loader@v0.0.23) (2024-03-06)


### Features

* added _maxMemory argument to AoLoader ([99bbac3](https://github.com/permaweb/ao/commit/99bbac3a4b1cf695737edb210df7aa0378d86646))

## [0.0.22](https://github.com/permaweb/ao/compare/loader@v0.0.21...loader@v0.0.22) (2024-02-17)


### Features

* **loader:** allow passing instantiateWasm to loader to use previously compiled WebAssembly.Module ([bc136e2](https://github.com/permaweb/ao/commit/bc136e2168443b99b369d85e45594542605bfc60))

## [0.0.21](https://github.com/permaweb/ao/compare/loader@v0.0.20...loader@v0.0.21) (2024-02-13)


### Bug Fixes

* set buffer to null for gc ([dee1d66](https://github.com/permaweb/ao/commit/dee1d66504cc7f1db6f97b68b36e0a2b0e22d533))

## [0.0.20](https://github.com/permaweb/ao/compare/loader@v0.0.19...loader@v0.0.20) (2024-02-12)

## [0.0.19](https://github.com/permaweb/ao/compare/loader@v0.0.18...loader@v0.0.19) (2024-02-09)


### Bug Fixes

* **loader:** dynamically resize the heap if incoming buffer is larger than initial size [#448](https://github.com/permaweb/ao/issues/448) ([6d07dab](https://github.com/permaweb/ao/commit/6d07dab79127bb16f7be13104e93cc2e1e38563e))

## [0.0.18](https://github.com/permaweb/ao/compare/loader@v0.0.17...loader@v0.0.18) (2024-02-09)

## [0.0.17](https://github.com/permaweb/ao/compare/loader@v0.0.15...loader@v0.0.17) (2024-02-06)

## [0.0.15](https://github.com/permaweb/ao/compare/loader@v0.0.14...loader@v0.0.15) (2024-02-06)


### Features

* **loader:** scope gas to Module. Allow refilling gas. Re-hookup cleanupListeners to prevent memory leaks [#412](https://github.com/permaweb/ao/issues/412) ([be1c53b](https://github.com/permaweb/ao/commit/be1c53b39a967f552a1c5e7800a39df7ea5df8bf))


### Bug Fixes

* loader not reseting security globals ([7b290a5](https://github.com/permaweb/ao/commit/7b290a512597734fd575c5dcce88132b4935002e))

## [0.0.14](https://github.com/permaweb/ao/compare/loader@v0.0.13...loader@v0.0.14) (2024-02-05)

## [0.0.13](https://github.com/permaweb/ao/compare/loader@v0.0.12...loader@v0.0.13) (2024-01-08)


### Bug Fixes

* **loader:** immediately remove emscripten interop module listeners effectively disabling them [#167](https://github.com/permaweb/ao/issues/167) ([455413d](https://github.com/permaweb/ao/commit/455413de0090120a3ca75da908e296a096d8357e))

## [0.0.12](https://github.com/permaweb/ao/compare/loader@v0.0.11...loader@v0.0.12) (2023-12-17)


### ⚠ BREAKING CHANGES

* **loader:** return new shape #234

* **loader:** return new shape [#234](https://github.com/permaweb/ao/issues/234) ([8d294f1](https://github.com/permaweb/ao/commit/8d294f12c2e8bf54f1746363918b056573b8c0cc))

## [0.0.11](https://github.com/permaweb/ao/compare/loader@v0.0.10...loader@v0.0.11) (2023-11-17)

## [0.0.10](https://github.com/permaweb/ao/compare/loader@v0.0.9...loader@v0.0.10) (2023-11-16)

## [0.0.9](https://github.com/permaweb/ao/compare/loader@v0.0.8...loader@v0.0.9) (2023-11-09)


### Bug Fixes

* **loader:** map both returned error and thrown error ([107be41](https://github.com/permaweb/ao/commit/107be410467237719a3fd94d54605f509c4fbd57))

## [0.0.8](https://github.com/permaweb/ao/compare/loader@v0.0.7...loader@v0.0.8) (2023-11-09)

## [0.0.7](https://github.com/permaweb/ao/compare/loader@v0.0.6...loader@v0.0.7) (2023-11-08)

## [0.0.6](https://github.com/permaweb/ao/compare/loader@v0.0.5...loader@v0.0.6) (2023-11-08)


### Bug Fixes

* bug with file console log message [#135](https://github.com/permaweb/ao/issues/135) ([72a5d6f](https://github.com/permaweb/ao/commit/72a5d6f6edea6315cb0dfa43c8b0b65172a3ed56))

## 0.0.5 (2023-11-07)


### Features

* **cli:** added ability to resume state from buffer [#126](https://github.com/permaweb/ao/issues/126) ([0ae4101](https://github.com/permaweb/ao/commit/0ae4101d3d0b39522f3c3ca57f6ad56317e816aa))
* **cli:** update loader to throw [#126](https://github.com/permaweb/ao/issues/126) ([cd54a5a](https://github.com/permaweb/ao/commit/cd54a5a63450223ee87165bc752b3bfa2aa9422e))
* **cli:** update versions [#126](https://github.com/permaweb/ao/issues/126) ([3693fe5](https://github.com/permaweb/ao/commit/3693fe57f2fa62d4964f4968fe7159792ee73ae3))
* **cli:** update versions and throw response [#126](https://github.com/permaweb/ao/issues/126) ([da519e4](https://github.com/permaweb/ao/commit/da519e48783e1396bd0802446974bc44f73bf320))
* **cli:** updated documentation and publish command [#126](https://github.com/permaweb/ao/issues/126) ([0449a4a](https://github.com/permaweb/ao/commit/0449a4a83abf6560f7d6ccec8a7ae94fa5973f3e))
* **cli:** wip - have code implemented just need to test more and update documentation [#126](https://github.com/permaweb/ao/issues/126) ([83eb085](https://github.com/permaweb/ao/commit/83eb0854a4da95b4567e46bff386c0f5c16ece0d))
* **dev-env:** added wasm loader - [#1](https://github.com/permaweb/ao/issues/1) ([793ed02](https://github.com/permaweb/ao/commit/793ed028a9d2722678b19937dcfa3e27cdc1f663))
* **loader:** handle interop response and either resolve or reject based on ok [#49](https://github.com/permaweb/ao/issues/49) ([bf75297](https://github.com/permaweb/ao/commit/bf752976399a2556c8d6fe06c10862610a418eea))


### Bug Fixes

* **loader:** get loader building properly, so it can be used in ESM modules ([3b7c8d1](https://github.com/permaweb/ao/commit/3b7c8d1aec0e37de776faa2e5cd27173828bb21b))

## 0.0.4 (2023-09-20)


### Features

* **dev-env:** added wasm loader - [#1](https://github.com/permaweb/ao/issues/1) ([793ed02](https://github.com/permaweb/ao/commit/793ed028a9d2722678b19937dcfa3e27cdc1f663))
* **loader:** handle interop response and either resolve or reject based on ok [#49](https://github.com/permaweb/ao/issues/49) ([bf75297](https://github.com/permaweb/ao/commit/bf752976399a2556c8d6fe06c10862610a418eea))


### Bug Fixes

* **loader:** get loader building properly, so it can be used in ESM modules ([3b7c8d1](https://github.com/permaweb/ao/commit/3b7c8d1aec0e37de776faa2e5cd27173828bb21b))

## 0.0.4 (2023-09-20)


### Features

* **dev-env:** added wasm loader - [#1](https://github.com/permaweb/ao/issues/1) ([793ed02](https://github.com/permaweb/ao/commit/793ed028a9d2722678b19937dcfa3e27cdc1f663))
* **loader:** handle interop response and either resolve or reject based on ok [#49](https://github.com/permaweb/ao/issues/49) ([bf75297](https://github.com/permaweb/ao/commit/bf752976399a2556c8d6fe06c10862610a418eea))


### Bug Fixes

* **loader:** get loader building properly, so it can be used in ESM modules ([3b7c8d1](https://github.com/permaweb/ao/commit/3b7c8d1aec0e37de776faa2e5cd27173828bb21b))
