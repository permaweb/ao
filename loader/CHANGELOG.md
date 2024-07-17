# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.35](https://github.com/permaweb/ao/compare/loader@v0.0.34...loader@v0.0.35) (2024-06-09)

## [0.0.34](https://github.com/permaweb/ao/compare/loader@v0.0.33...loader@v0.0.34) (2024-06-09)

## [0.0.33](https://github.com/permaweb/ao/compare/loader@v0.0.32...loader@v0.0.33) (2024-06-04)


### Features

* **loader:** weavedrive should be optional for wasm64 ([0a35880](https://github.com/permaweb/ao/commit/0a3588059d0d03ebd5df014287c4c4f6d6d2c5de))

## [0.0.32](https://github.com/permaweb/ao/compare/loader@v0.0.31...loader@v0.0.32) (2024-05-23)


### Bug Fixes

* **loader:** added test file ([5cc3506](https://github.com/permaweb/ao/commit/5cc3506161cef295c61d6f72cf1adf0bc2096c83))
* update glue code with setting  system flag to false ([eb92015](https://github.com/permaweb/ao/commit/eb920154d9ce0d4431f17062854eef28d04995f6))

## [0.0.31](https://github.com/permaweb/ao/compare/loader@v0.0.30...loader@v0.0.31) (2024-05-14)


### Features

* add resizeHeap to Module ([3b3eeda](https://github.com/permaweb/ao/commit/3b3eeda1bced62585f75f3a7bdead544e5b5fff2))
* add resizeHeap to Module ([10130d3](https://github.com/permaweb/ao/commit/10130d3071b6b280be35f04b4f2481add630e264))

## [0.0.30](https://github.com/permaweb/ao/compare/loader@v0.0.29...loader@v0.0.30) (2024-05-14)


### Features

* all tests passing for ao-loader ([70bbc85](https://github.com/permaweb/ao/commit/70bbc85d6c0da7a1fa24781b9ed5999c94e09626))
* ao loader support of aos64 a ([be9ff8e](https://github.com/permaweb/ao/commit/be9ff8e29c08a8334479cc64f50eb9d5f4843188))
* ao-loader working with llm ([6191434](https://github.com/permaweb/ao/commit/6191434b984ea44a2987f559803c8be25f834daa))
* got llm test working with ao-loader wip ([0dab485](https://github.com/permaweb/ao/commit/0dab485f64a027b9befe335580590d0192dda9c0))
* got test running via aoloader ([edcabec](https://github.com/permaweb/ao/commit/edcabeccf9db1aa16a4ba7810614880241546c2e))
* skip llm test ([867f4cf](https://github.com/permaweb/ao/commit/867f4cfcba3c37b1d70cde15203c9434bc626989))
* skip llm test ([fae3359](https://github.com/permaweb/ao/commit/fae33594506ddbfb82a73347300153c3d121c2ee))

## [0.0.29](https://github.com/permaweb/ao/compare/loader@v0.0.28...loader@v0.0.29) (2024-04-30)


### Features

* added upgraded emscripten to work with llama wasm [#654](https://github.com/permaweb/ao/issues/654) ([29c72b3](https://github.com/permaweb/ao/commit/29c72b386acac5110daa03c193ee77dd80711f23))


### Bug Fixes

* fix the integration test [#654](https://github.com/permaweb/ao/issues/654) ([0244421](https://github.com/permaweb/ao/commit/02444213596ddb10e24f6d19f1317409049b7a90))

## [0.0.28](https://github.com/permaweb/ao/compare/loader@v0.0.27...loader@v0.0.28) (2024-04-22)


### Features

* wip experimental wasm 64 ([1799ae4](https://github.com/permaweb/ao/commit/1799ae417492e0093bb22c083eb75315ddf7334f))

## [0.0.27](https://github.com/permaweb/ao/compare/loader@v0.0.26...loader@v0.0.27) (2024-04-22)


### Features

* apply metering to wasm64 modules ([a615396](https://github.com/permaweb/ao/commit/a615396d32160320be112c122e4e77afe95042b4))
* wasm64 work in progress ([5486f9f](https://github.com/permaweb/ao/commit/5486f9f7783ab1b7bca5c64a6545e76f553bf313))
* wasm64 working with no metering ([57298d6](https://github.com/permaweb/ao/commit/57298d6706b63e9ae57878c38e767714ec36d8ac))

## [0.0.26](https://github.com/permaweb/ao/compare/loader@v0.0.25...loader@v0.0.26) (2024-04-11)


### Bug Fixes

* **loader:** add Assignments to loader return shape ([ff46dc6](https://github.com/permaweb/ao/commit/ff46dc6874feeaff4124a9d3e30510cc49d2fab3))

## [0.0.25](https://github.com/permaweb/ao/compare/loader@v0.0.24...loader@v0.0.25) (2024-04-10)


### Features

* **dev-cli:** add assignment support to ao.lua [#598](https://github.com/permaweb/ao/issues/598) ([5a04dda](https://github.com/permaweb/ao/commit/5a04dda5490137af1a298157bf4ee6cc094859ac))


### Bug Fixes

* **dev-cli:** remove unused import [#598](https://github.com/permaweb/ao/issues/598) ([089a142](https://github.com/permaweb/ao/commit/089a1423a108cf5e9ef38fc8f62cef9df73a27bf))
* **loader:** fix unit test [#598](https://github.com/permaweb/ao/issues/598) ([042f728](https://github.com/permaweb/ao/commit/042f728672f60a4475120aec3927b6ca6dbf3701))

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
