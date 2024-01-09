# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.26](https://github.com/permaweb/ao/compare/connect@v0.0.25...connect@v0.0.26) (2024-01-09)


### Bug Fixes

* **connect:** return typings for result match actual shape ([5360ccb](https://github.com/permaweb/ao/commit/5360ccb50681737e862525d5043c79a13d9c303e))

## [0.0.25](https://github.com/permaweb/ao/compare/connect@v0.0.24...connect@v0.0.25) (2024-01-09)

## 0.0.24 (2024-01-09)


### ⚠ BREAKING CHANGES

* **connect:** rename project and CI from sdk to connect #291

* **connect:** rename project and CI from sdk to connect [#291](https://github.com/permaweb/ao/issues/291) ([55e3a8b](https://github.com/permaweb/ao/commit/55e3a8b410c99f6112b5e1e63980bb11aa541ffd))

## [0.0.23](https://github.com/permaweb/ao/compare/sdk@v0.0.22...sdk@v0.0.23) (2024-01-08)


### Features

* update readme to show support for data [#285](https://github.com/permaweb/ao/issues/285) ([604975a](https://github.com/permaweb/ao/commit/604975ae650e96ec86f7dd1e36b665fd96924fcd))


### Bug Fixes

* **sdk:** ts types for signer on spawn and message ([e622619](https://github.com/permaweb/ao/commit/e622619cc516a7b0a6e45a07a6c70eb5e3cdb9e2))
* **sdk:** use signer type on node and browser implementations JSDocs ([5271e66](https://github.com/permaweb/ao/commit/5271e6660532990caa660f62032d7371317c5837))

## [0.0.22](https://github.com/permaweb/ao/compare/sdk@v0.0.21...sdk@v0.0.22) (2024-01-02)


### ⚠ BREAKING CHANGES

* **sdk:** result requires to be provided process id #263

### Bug Fixes

* **sdk:** result requires to be provided process id [#263](https://github.com/permaweb/ao/issues/263) ([8965dee](https://github.com/permaweb/ao/commit/8965deeb93ded85a2d5f4864bf81f2389aa82b2e))

## [0.0.21](https://github.com/permaweb/ao/compare/sdk@v0.0.20...sdk@v0.0.21) (2023-12-21)

## [0.0.20](https://github.com/permaweb/ao/compare/sdk@v0.0.19...sdk@v0.0.20) (2023-12-19)


### Features

* **cu,mu,sdk:** better preservation of error on bubble to errFrom ([f706951](https://github.com/permaweb/ao/commit/f7069513d8c02e3422c484b3b34642d6d29ad408))
* **sdk:** add Variant tag on spawn and message ([cc4436c](https://github.com/permaweb/ao/commit/cc4436c813450a2910853e3415f2a3c88228ca6c))

## [0.0.19](https://github.com/permaweb/ao/compare/sdk@v0.0.18...sdk@v0.0.19) (2023-12-17)


### ⚠ BREAKING CHANGES

* **sdk:** post process and message to root of MU #208
* **sdk:** messageId -> message on result api
* **sdk:** add proper tags to ao Message and verify proper process tags. Allow passing data #216
* **sdk:** verify presence of scheduler tag on spawn. remove id suffix from inputs #210 #212
* **sdk:** verify tags on module #212
* **sdk:** srcId -> moduleId on spawn and set proper tags #210
* **sdk:** sendMessage -> message, spawnProcess -> spawn, readResult -> result #207

* **sdk:** post process and message to root of MU [#208](https://github.com/permaweb/ao/issues/208) ([436863a](https://github.com/permaweb/ao/commit/436863a0bb4d79aa09e4f558b27534c7de7b3617))


### Features

* **sdk:** add proper tags to ao Message and verify proper process tags. Allow passing data [#216](https://github.com/permaweb/ao/issues/216) ([34699c8](https://github.com/permaweb/ao/commit/34699c80221add25cc08cc1d9b83c4b7a585682d))
* **sdk:** allow passing data to spawn [#210](https://github.com/permaweb/ao/issues/210) ([4d11262](https://github.com/permaweb/ao/commit/4d1126236ebbeb9ea6b63853e7a2d52f853e156f))
* **sdk:** locate process scheduler on message in order to verify ao Process [#229](https://github.com/permaweb/ao/issues/229) ([4c71c28](https://github.com/permaweb/ao/commit/4c71c28297b723e7db7eca155ca371a665729454))
* **sdk:** messageId -> message on result api ([95fb277](https://github.com/permaweb/ao/commit/95fb277fc50e76fe53c8f855dcec112013accda1))
* **sdk:** sendMessage -> message, spawnProcess -> spawn, readResult -> result [#207](https://github.com/permaweb/ao/issues/207) ([b3cdc3a](https://github.com/permaweb/ao/commit/b3cdc3ab72518a122255591964c6f018aa58c559))
* **sdk:** srcId -> moduleId on spawn and set proper tags [#210](https://github.com/permaweb/ao/issues/210) ([8693881](https://github.com/permaweb/ao/commit/86938811cc7e51cfc23cc942da3e095741cd361e))
* **sdk:** validate provided scheduler on spawn [#214](https://github.com/permaweb/ao/issues/214) ([04c212f](https://github.com/permaweb/ao/commit/04c212f70f488c0dc6375cce50c5d4d3ffe85e43))
* **sdk:** verify presence of scheduler tag on spawn. remove id suffix from inputs [#210](https://github.com/permaweb/ao/issues/210) [#212](https://github.com/permaweb/ao/issues/212) ([fc9f22e](https://github.com/permaweb/ao/commit/fc9f22e43f1da0a5f214bc5951f2babf25b30aef))
* **sdk:** verify tags on module [#212](https://github.com/permaweb/ao/issues/212) ([8b6b329](https://github.com/permaweb/ao/commit/8b6b329cbb804ad44a6e19e6f17f296f9274612b))

## [0.0.18](https://github.com/permaweb/ao/compare/sdk@v0.0.17...sdk@v0.0.18) (2023-11-10)


### Features

* **sdk:** add error formatter to format zod errors to be more useful ([c72bee4](https://github.com/permaweb/ao/commit/c72bee4f3106ed90c5ef84f099127f82a8583db1))


### Bug Fixes

* **sdk:** entrypoints readState -> readResult ([b46877f](https://github.com/permaweb/ao/commit/b46877f7008a8119e90420ca44744bffd43a064d))

## [0.0.17](https://github.com/permaweb/ao/compare/sdk@v0.0.16...sdk@v0.0.17) (2023-11-10)


### ⚠ BREAKING CHANGES

* **sdk:** with the introduction of BiBo, readState is no longer
a useful api, since the state is an opaque byte array. Instead, in order
to "readState", a consumer should use sendMessage invoking a function
the process supports to obtain a view of the state in the message's eval
output. The consumer can then parse output according to its needs.
* **sdk:** rename writeMessage -> sendMessage and createProcess -> spawnProcess #142

* **sdk:** rename writeMessage -> sendMessage and createProcess -> spawnProcess [#142](https://github.com/permaweb/ao/issues/142) ([2cf3602](https://github.com/permaweb/ao/commit/2cf3602c77d36ac719f9f418b2e2be277bc447e2))


### Features

* **sdk:** remove readState and implement readResult [#148](https://github.com/permaweb/ao/issues/148) ([4e592b8](https://github.com/permaweb/ao/commit/4e592b8a3ceaf8f93908b8c594ebe2a722dcb1a3))

## [0.0.16](https://github.com/permaweb/ao/compare/sdk@v0.0.15...sdk@v0.0.16) (2023-11-08)


### Features

* **sdk:** expose connect to allow passing ao component urls ([ea09174](https://github.com/permaweb/ao/commit/ea0917452d547098f262397a0a2be6fdec32d14c))

## [0.0.15](https://github.com/permaweb/ao/compare/sdk@v0.0.14...sdk@v0.0.15) (2023-11-02)


### Bug Fixes

* **sdk:** load process meta from SU to prevent race condition on gateway ([bafd07f](https://github.com/permaweb/ao/commit/bafd07febdec82dc4e5a471df89daab9edd97791))

## [0.0.14](https://github.com/permaweb/ao/compare/sdk@v0.0.13...sdk@v0.0.14) (2023-11-02)


### Features

* **sdk:** add registering the process with the SU, after deploying to Irys ([ee9ae88](https://github.com/permaweb/ao/commit/ee9ae88719e01c060122b6001e6a8609ce962597))

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
