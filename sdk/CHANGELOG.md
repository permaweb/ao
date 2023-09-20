# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## 0.0.2 (2023-09-20)


### Features

* **sdk:** add contract to SWGlobal [#20](https://github.com/permaweb/ao/issues/20) ([3258890](https://github.com/permaweb/ao/commit/325889050fd93bd37da56b7ea80c05bc1d702a86))
* **sdk:** add dal [#20](https://github.com/permaweb/ao/issues/20) ([6563c0b](https://github.com/permaweb/ao/commit/6563c0b82685b3d937e93d627f851e6af5a891d9))
* **sdk:** add loadActions to pipeline [#20](https://github.com/permaweb/ao/issues/20) ([b90b0da](https://github.com/permaweb/ao/commit/b90b0daf74e07c8d5008d4385dc908c209f40f19))
* **sdk:** add loadInitialState [#20](https://github.com/permaweb/ao/issues/20) ([7c912c3](https://github.com/permaweb/ao/commit/7c912c35d69b31466b0892375f517a9f57727ae0))
* **sdk:** fetch multiple pages of interactions from sequencer if necessary [#37](https://github.com/permaweb/ao/issues/37) ([b30a026](https://github.com/permaweb/ao/commit/b30a02657dea651f0f3c94c688722a85012de8c8))
* **sdk:** first pass at PouchDB db client [#20](https://github.com/permaweb/ao/issues/20) ([096c7a9](https://github.com/permaweb/ao/commit/096c7a94a9eede8a69a2bb96b2d27fc8b4d4dde8))
* **sdk:** get evaluate to work on its own [#20](https://github.com/permaweb/ao/issues/20) ([73dcce2](https://github.com/permaweb/ao/commit/73dcce29fc220fa4d4580d76bbaf1a5f73a234f6))
* **sdk:** handle sad path during eval and rebuild contracts to use new loader semantics [#49](https://github.com/permaweb/ao/issues/49) ([23686ff](https://github.com/permaweb/ao/commit/23686ff803fd6c74b090a67c4bfbfea3a8d50624))
* **sdk:** implement debug logger [#20](https://github.com/permaweb/ao/issues/20) ([edf7c87](https://github.com/permaweb/ao/commit/edf7c87fae831d3bf613062ead8d305e40dc407f))
* **sdk:** loadActions also returns sortKey along with action [#20](https://github.com/permaweb/ao/issues/20) ([c17f6b5](https://github.com/permaweb/ao/commit/c17f6b5a9e2c924bbe63b00b59f6d4cad6ab0884))
* **sdk:** loadState checks local cache for most recent state and falls back to initial state [#20](https://github.com/permaweb/ao/issues/20) ([6211b11](https://github.com/permaweb/ao/commit/6211b11413c8fc15e9087f17b8f6037a09c3a168))
* **sdk:** persist action in cache [#20](https://github.com/permaweb/ao/issues/20) ([20e9fc0](https://github.com/permaweb/ao/commit/20e9fc07e38846cb98192b6fa6bf6ec5015d3b19))
* **sdk:** properly coerce value from block [#20](https://github.com/permaweb/ao/issues/20) ([4087617](https://github.com/permaweb/ao/commit/408761736ff6f6068a04aafc0ee845ea0e957f81))
* **sdk:** start writing evaluate [#20](https://github.com/permaweb/ao/issues/20) ([330ddbd](https://github.com/permaweb/ao/commit/330ddbd8dcb7eefcf4b0891789ffa7fa601cc1ca))
* **sdk:** stub out writeInteraction [#20](https://github.com/permaweb/ao/issues/20) ([a2b92a9](https://github.com/permaweb/ao/commit/a2b92a988f30fba20f681653c145b6daec3d1b73))
* **sdk:** use schemas to enforce returns of each stage in pipeline [#20](https://github.com/permaweb/ao/issues/20) ([635b3cc](https://github.com/permaweb/ao/commit/635b3cc142920a1af6168965f5401286c9b46bed))


### Bug Fixes

* **sdk:** cache check for latest interaction working. Cleanup [#20](https://github.com/permaweb/ao/issues/20) ([97b2cde](https://github.com/permaweb/ao/commit/97b2cde398d40f3eee7b54dcf816c19a627a5139))
* **sdk:** do not set from if no cached evaluation exists [#20](https://github.com/permaweb/ao/issues/20) ([88c0cc6](https://github.com/permaweb/ao/commit/88c0cc6228cbd6261408636ea8f7a7feea7abb81))
* **sdk:** ensure block height used as sortkey is properly left padding when loading initial state from chain [#20](https://github.com/permaweb/ao/issues/20) ([e57043c](https://github.com/permaweb/ao/commit/e57043cd86ca10b381b1b3fbd2a23e12704c4835))
* **sdk:** include result in output from cached latest interaction [#20](https://github.com/permaweb/ao/issues/20) ([89aa3ec](https://github.com/permaweb/ao/commit/89aa3ec6032c154cd0a6281f78db1ea45a1bcdee))
* **sdk:** only send defined parameters to WarpSequencer as query params [#20](https://github.com/permaweb/ao/issues/20) ([96497e8](https://github.com/permaweb/ao/commit/96497e80d2a7666c1b6e801f909a14b2fa404473))
* **sdk:** place all contents of input tag in action.input for interaction ([5b420a1](https://github.com/permaweb/ao/commit/5b420a12bff63a84969a79c055f7d94ad041a4bf))
* **sdk:** readState end to end [#20](https://github.com/permaweb/ao/issues/20) ([8b52a3e](https://github.com/permaweb/ao/commit/8b52a3ef41e867b5e9b6c9dc4df3a7c0c4d4da57))
