# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.13](https://github.com/permaweb/ao/compare/sdk@v0.0.12...sdk@v0.0.13) (2023-10-31)


### Features

* **cu:** deploy process via the SU instead of directly to Irys ([d2eaba4](https://github.com/permaweb/ao/commit/d2eaba4076f0046e77d10cdeae35de2606722fe5))

## [0.0.12](https://github.com/permaweb/ao/compare/sdk@v0.0.11...sdk@v0.0.12) (2023-10-31)


### Features

* **sdk:** add registering the process with the SU, after deploying to Irys ([5fa78b1](https://github.com/permaweb/ao/commit/5fa78b1e48a98166bb088770b77022a3b45e9526))

## [0.0.11](https://github.com/permaweb/ao/compare/sdk@v0.0.10...sdk@v0.0.11) (2023-10-24)


### ⚠ BREAKING CHANGES

* **sdk:** writeInteraction is renamed to writeMessage. writeMessage
accepts processId instead of contractId
* **sdk:** instead of contractId, public apis will instead accept
processId. createContract has been renamed to createProcess. readState
now accepts processId instead of contractId

### Features

* **sdk:** add ao tags on writeMessage [#93](https://github.com/permaweb/ao/issues/93) ([f0e4117](https://github.com/permaweb/ao/commit/f0e41177dbad676e0063976c4327767f5e25e279))
* **sdk:** add new ao tags and dedupe crucial tags [#93](https://github.com/permaweb/ao/issues/93) ([4cc762d](https://github.com/permaweb/ao/commit/4cc762dd504af345c228bf37d3e1ea119f5010ee))
* **sdk:** ensure ao-type tag only exists once when uploading message to prevent dups ([f851dd0](https://github.com/permaweb/ao/commit/f851dd0459c3e5dac4f87b1c34185a3bacd4fdd6))
* **sdk:** remove need to check certain source tags when creating contract [#93](https://github.com/permaweb/ao/issues/93) ([1a89a9c](https://github.com/permaweb/ao/commit/1a89a9c8bac37313232cf235db05791ca86c35b1))
* **sdk:** rename writeInteraction to writeMessage [#93](https://github.com/permaweb/ao/issues/93) ([40352bb](https://github.com/permaweb/ao/commit/40352bb3ca4e8734d12c2e91d3951d84047e5dc6))
* **sdk:** replace usage of contract with process on apis ([fec0753](https://github.com/permaweb/ao/commit/fec07535977c25851d1c3346d2a8cfc04a8acf8c))
* **sdk:** set target on data item and allow passing anchor [#93](https://github.com/permaweb/ao/issues/93) ([5f0a7e4](https://github.com/permaweb/ao/commit/5f0a7e4680abb05b0603e212e4bf3fe568e93056))


### Bug Fixes

* **sdk:** send correct headers to MU when posting a message [#93](https://github.com/permaweb/ao/issues/93) ([aa176ff](https://github.com/permaweb/ao/commit/aa176ffddd40482530eb9ec94d59bfa46e297b36))

## [0.0.10](https://github.com/permaweb/ao/compare/sdk@v0.0.9...sdk@v0.0.10) (2023-10-06)

## [0.0.9](https://github.com/permaweb/ao/compare/sdk@v0.0.8...sdk@v0.0.9) (2023-10-06)


### Features

* **sdk:** add deployContract impl to the browser WalletClient ([d6ee734](https://github.com/permaweb/ao/commit/d6ee734ff6ae673ffe32967b4edd3b379949640f))
* **sdk:** add irys client impl for deployContract ([178bada](https://github.com/permaweb/ao/commit/178bada4cea4297616f8b457c1c0e19f2a3647c3))
* **sdk:** add registerContract api impl for Warp Gateway ([54f0982](https://github.com/permaweb/ao/commit/54f0982df8bc9632a53a68fc1bdd9fc1c0dda47a))
* **sdk:** add step to register contract, as part of createContract ([078c4d9](https://github.com/permaweb/ao/commit/078c4d92d5029100941932b28c8761cc3850e34d))
* **sdk:** add wallet api on node createDataItemSigner impl ([254f683](https://github.com/permaweb/ao/commit/254f683165571596dd10b37a1ceee6d315ae3db7))
* **sdk:** use different methods of deploying contract between node and browser ([15cdad5](https://github.com/permaweb/ao/commit/15cdad57f6e852cbb9b36b6ed834fc1ce9b66a15))


### Bug Fixes

* **sdk:** browser deployContract use arweave global to create transaction ([3216156](https://github.com/permaweb/ao/commit/32161569651fcfc73a4c28f674de65c1aed2435f))

## [0.0.8](https://github.com/permaweb/ao/compare/sdk@v0.0.7...sdk@v0.0.8) (2023-10-04)


### Bug Fixes

* **sdk:** readState returns the entire output, not just state ([025bed6](https://github.com/permaweb/ao/commit/025bed6a8d035a4879892486cdc943806dfe570a))

## [0.0.7](https://github.com/permaweb/ao/compare/sdk@v0.0.6...sdk@v0.0.7) (2023-10-03)

## [0.0.6](https://github.com/permaweb/ao/compare/sdk@v0.0.5...sdk@v0.0.6) (2023-09-29)


### Bug Fixes

* **sdk:** polyfill buffer in browser bundle ([40766e7](https://github.com/permaweb/ao/commit/40766e731108d905f1948b39b57f7d03ed9ce28a))

## [0.0.5](https://github.com/permaweb/ao/compare/sdk@v0.0.4...sdk@v0.0.5) (2023-09-29)

## 0.0.4 (2023-09-28)


### Features

* **sdk:** add contract to SWGlobal [#20](https://github.com/permaweb/ao/issues/20) ([3258890](https://github.com/permaweb/ao/commit/325889050fd93bd37da56b7ea80c05bc1d702a86))
* **sdk:** add dal [#20](https://github.com/permaweb/ao/issues/20) ([6563c0b](https://github.com/permaweb/ao/commit/6563c0b82685b3d937e93d627f851e6af5a891d9))
* **sdk:** add loadActions to pipeline [#20](https://github.com/permaweb/ao/issues/20) ([b90b0da](https://github.com/permaweb/ao/commit/b90b0daf74e07c8d5008d4385dc908c209f40f19))
* **sdk:** add loadInitialState [#20](https://github.com/permaweb/ao/issues/20) ([7c912c3](https://github.com/permaweb/ao/commit/7c912c35d69b31466b0892375f517a9f57727ae0))
* **sdk:** create warp-gateway client and deployContract impl ([48f554f](https://github.com/permaweb/ao/commit/48f554f2adfd23bb1f88e253a83565348759c725))
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
* **sdk:** update README [#50](https://github.com/permaweb/ao/issues/50) ([fadb9ca](https://github.com/permaweb/ao/commit/fadb9ca7530e8e79a896bdc872c1c18fbf43dffe))
* **sdk:** uploadContract and tests as part of createContract [#50](https://github.com/permaweb/ao/issues/50) ([9711c7b](https://github.com/permaweb/ao/commit/9711c7b77900dc313a3b738aefe31ad34491ee3b))
* **sdk:** uploadContract as part of createContract. Still needs tests [#50](https://github.com/permaweb/ao/issues/50) ([b65f597](https://github.com/permaweb/ao/commit/b65f59775e6aecadb12d337e9ff51a75f3723d30))
* **sdk:** use schemas to enforce returns of each stage in pipeline [#20](https://github.com/permaweb/ao/issues/20) ([635b3cc](https://github.com/permaweb/ao/commit/635b3cc142920a1af6168965f5401286c9b46bed))
* **sdk:** verify-inputs on createContract [#50](https://github.com/permaweb/ao/issues/50) ([5b5ec3b](https://github.com/permaweb/ao/commit/5b5ec3bc0bd25195886a028a2bc19cb26be27a9b))
* **sdk:** wallet client api for browser and node [#50](https://github.com/permaweb/ao/issues/50) ([0106fbe](https://github.com/permaweb/ao/commit/0106fbe363d569d3e9731568dfef5935b2c1d83f))


### Bug Fixes

* **sdk:** cache check for latest interaction working. Cleanup [#20](https://github.com/permaweb/ao/issues/20) ([97b2cde](https://github.com/permaweb/ao/commit/97b2cde398d40f3eee7b54dcf816c19a627a5139))
* **sdk:** do not set from if no cached evaluation exists [#20](https://github.com/permaweb/ao/issues/20) ([88c0cc6](https://github.com/permaweb/ao/commit/88c0cc6228cbd6261408636ea8f7a7feea7abb81))
* **sdk:** ensure block height used as sortkey is properly left padding when loading initial state from chain [#20](https://github.com/permaweb/ao/issues/20) ([e57043c](https://github.com/permaweb/ao/commit/e57043cd86ca10b381b1b3fbd2a23e12704c4835))
* **sdk:** include result in output from cached latest interaction [#20](https://github.com/permaweb/ao/issues/20) ([89aa3ec](https://github.com/permaweb/ao/commit/89aa3ec6032c154cd0a6281f78db1ea45a1bcdee))
* **sdk:** modify warp-gateway deployContract api to modify Content-Type to the value Warp Gateway expects [#50](https://github.com/permaweb/ao/issues/50) ([3c9d217](https://github.com/permaweb/ao/commit/3c9d217026258d0f5563bc1c30f0d8ab72fb7f82))
* **sdk:** only send defined parameters to WarpSequencer as query params [#20](https://github.com/permaweb/ao/issues/20) ([96497e8](https://github.com/permaweb/ao/commit/96497e80d2a7666c1b6e801f909a14b2fa404473))
* **sdk:** place all contents of input tag in action.input for interaction ([5b420a1](https://github.com/permaweb/ao/commit/5b420a12bff63a84969a79c055f7d94ad041a4bf))
* **sdk:** readState end to end [#20](https://github.com/permaweb/ao/issues/20) ([8b52a3e](https://github.com/permaweb/ao/commit/8b52a3ef41e867b5e9b6c9dc4df3a7c0c4d4da57))
* **sdk:** reference mu off of env ([8d45cf0](https://github.com/permaweb/ao/commit/8d45cf02a85ce0743086458980967e4a848fb5f6))
* **sdk:** use leveldb adapter in lieu of node-websql adapter for pouch ([7faf2d1](https://github.com/permaweb/ao/commit/7faf2d18f7f2fe5b149f249f954a3f0964370d63))
* **sdk:** writeInteraction use the signer api [#50](https://github.com/permaweb/ao/issues/50) ([a355980](https://github.com/permaweb/ao/commit/a3559808dd86efd44115a8891471ced958764370))

## 0.0.3 (2023-09-26)


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
* **sdk:** reference mu off of env ([8d45cf0](https://github.com/permaweb/ao/commit/8d45cf02a85ce0743086458980967e4a848fb5f6))
* **sdk:** use leveldb adapter in lieu of node-websql adapter for pouch ([7faf2d1](https://github.com/permaweb/ao/commit/7faf2d18f7f2fe5b149f249f954a3f0964370d63))

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
