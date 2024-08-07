# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.58](https://github.com/permaweb/ao/compare/connect@v0.0.57...connect@v0.0.58) (2024-08-06)


### Features

* **connect:** bump scheduler-utils and expose GRAPHQL_MAX_RETRIES and GRAPHQL_RETRY_BACKOFF ([758bc20](https://github.com/permaweb/ao/commit/758bc20f82eaf17e0f0f58243505a7a48fcfa4dc))


### Bug Fixes

* **repo,ur,cu,mu,scheduler-utils,connect:** remove engine to force use of npm ([fbe7de5](https://github.com/permaweb/ao/commit/fbe7de51a973dd93fedade27d8b2aa1feaba0f6b))

## [0.0.57](https://github.com/permaweb/ao/compare/connect@v0.0.56...connect@v0.0.57) (2024-07-24)

## [0.0.56](https://github.com/permaweb/ao/compare/connect@v0.0.55...connect@v0.0.56) (2024-06-18)


### Bug Fixes

* **connect:** add note to readme about usage with Next.js [#526](https://github.com/permaweb/ao/issues/526) ([4aeb407](https://github.com/permaweb/ao/commit/4aeb407619d09e2df76eacbaec9964a06e8c1a19))
* **connect:** fix webpack module resolution for browsers ([f1dbada](https://github.com/permaweb/ao/commit/f1dbada732a8553502eaa7d313236e005c2bd5fa))

## [0.0.55](https://github.com/permaweb/ao/compare/connect@v0.0.54...connect@v0.0.55) (2024-05-28)


### Features

* **connect:** add serializeCron util function to connect ([51552fc](https://github.com/permaweb/ao/commit/51552fccb64cd6caddffc51c3bd8b7ef3c8aba1d))

## [0.0.54](https://github.com/permaweb/ao/compare/connect@v0.0.53...connect@v0.0.54) (2024-05-21)


### Features

* **ethereum signer:** added ethereum data item node signer ([36cb926](https://github.com/permaweb/ao/commit/36cb92634dc187594618418c22dd736839da8415))


### Bug Fixes

* **arbundles:** pin arbunles at 0.11.0 ([d2cdc44](https://github.com/permaweb/ao/commit/d2cdc444e46c27add1caaa04af74cd1626a6a90e))
* **connect:** use correct type in results JSDoc [#714](https://github.com/permaweb/ao/issues/714) ([6a9d14f](https://github.com/permaweb/ao/commit/6a9d14f7ae158c5d6b24f37dae2d53d3941898f4))
* **connect:** warp arbundles - clean out unused exports - remove polyfills from build ([695eba1](https://github.com/permaweb/ao/commit/695eba16570b3974ec2aa6109dca7bede35d5632))
* **signers:** remove eth and sol signers and deps ([dd94480](https://github.com/permaweb/ao/commit/dd9448098ff49a8bf3d41965db9dbe5dffc09a75))
* **tests:** hard code private keys in tests to remove randomness ([1fc954e](https://github.com/permaweb/ao/commit/1fc954eeb47b26f02139f858f1424ce7e86c7c35))
* **wallets:** add wallet signers for solana and ethereum in node env ([25cd44e](https://github.com/permaweb/ao/commit/25cd44ef7beb920c9685dc1c0b9806690f83b1f0))

## [0.0.53](https://github.com/permaweb/ao/compare/connect@v0.0.52...connect@v0.0.53) (2024-04-26)


### Bug Fixes

* **connect:** add missing limit arg to results ([1ad6c44](https://github.com/permaweb/ao/commit/1ad6c44e3a0d7ee406856aa3a5b914843896a3b1))
* **connect:** add missing limit property to ao-cu results jsdoc ([9a92054](https://github.com/permaweb/ao/commit/9a920540f2969941888bb78fa4c26ee9b1c473c5))

## [0.0.52](https://github.com/permaweb/ao/compare/connect@v0.0.51...connect@v0.0.52) (2024-04-18)


### Features

* **connect:** add assign function [#612](https://github.com/permaweb/ao/issues/612) ([d557ebb](https://github.com/permaweb/ao/commit/d557ebbb95792f5200f641c47abf2230be9c3cdf))
* **connect:** add baseLayer and exclude params [#611](https://github.com/permaweb/ao/issues/611) ([f50e58a](https://github.com/permaweb/ao/commit/f50e58a0e37edb4724a103d429d67ed1f212b620))


### Bug Fixes

* **connect:** change param to list [#611](https://github.com/permaweb/ao/issues/611) ([bed821c](https://github.com/permaweb/ao/commit/bed821cca8443646f3966fbc66b3d7261ca5678e))
* **connect:** fix test and types [#611](https://github.com/permaweb/ao/issues/611) ([1b7a5cd](https://github.com/permaweb/ao/commit/1b7a5cdd2854a1cbb76849028c3f758635a96646))

## [0.0.51](https://github.com/permaweb/ao/compare/connect@v0.0.50...connect@v0.0.51) (2024-03-27)


### Bug Fixes

* **connect:** pass GRAPHQL_URL to GatewayClient ([e8c0f2c](https://github.com/permaweb/ao/commit/e8c0f2c58ba6a7adee6b5c674fb4c045f78169e9))

## [0.0.50](https://github.com/permaweb/ao/compare/connect@v0.0.49...connect@v0.0.50) (2024-03-26)


### Features

* **connect:** support passing full GRAPHQL_URL and use latest version of scheduler-utils [#551](https://github.com/permaweb/ao/issues/551) ([43b6462](https://github.com/permaweb/ao/commit/43b6462b4f0bfd9965d00d3dd403f50af801b039))

## [0.0.49](https://github.com/permaweb/ao/compare/connect@v0.0.48...connect@v0.0.49) (2024-03-25)

## [0.0.48](https://github.com/permaweb/ao/compare/connect@v0.0.47...connect@v0.0.48) (2024-03-12)

## [0.0.47](https://github.com/permaweb/ao/compare/connect@v0.0.46...connect@v0.0.47) (2024-03-11)

## [0.0.46](https://github.com/permaweb/ao/compare/connect@v0.0.45...connect@v0.0.46) (2024-03-11)


### Features

* allow ssr frameworks to load the browser version of aoconnect ([d25a35e](https://github.com/permaweb/ao/commit/d25a35e415b144b8a8d5dd0d6da782543af65bdc))


### Bug Fixes

* 'warp-arbundles' does not contain a default export ([4c728f5](https://github.com/permaweb/ao/commit/4c728f5c7964f0c569af157b7af7d6843d8f63bb))
* referenceError: _class_private_method_init is not defined ([08be769](https://github.com/permaweb/ao/commit/08be769a590be924138731d3f0c13d1cf83314d6))

## [0.0.45](https://github.com/permaweb/ao/compare/connect@v0.0.44...connect@v0.0.45) (2024-03-06)

## [0.0.44](https://github.com/permaweb/ao/compare/connect@v0.0.43...connect@v0.0.44) (2024-03-03)


### Features

* **connect:** cache process meta in LRU in-memory cache [#511](https://github.com/permaweb/ao/issues/511) ([9c6fed3](https://github.com/permaweb/ao/commit/9c6fed3f812b4e42df8ea0b4a609996d5a23430e))

## [0.0.43](https://github.com/permaweb/ao/compare/connect@v0.0.42...connect@v0.0.43) (2024-02-12)


### Bug Fixes

* **connect:** make Id and Owner optional, while providing defaults, on drynrun [#451](https://github.com/permaweb/ao/issues/451) ([7bb32b9](https://github.com/permaweb/ao/commit/7bb32b960859aae51f243df4983ff1d04475d6f2))

## [0.0.42](https://github.com/permaweb/ao/compare/connect@v0.0.41...connect@v0.0.42) (2024-02-09)


### Bug Fixes

* **connect:** typo in dry-run url remove trailing slash ([168f71f](https://github.com/permaweb/ao/commit/168f71f50ad25ec096feeb206d2f7658a6e1bcec))

## [0.0.41](https://github.com/permaweb/ao/compare/connect@v0.0.40...connect@v0.0.41) (2024-02-08)

## [0.0.40](https://github.com/permaweb/ao/compare/connect@v0.0.39...connect@v0.0.40) (2024-02-01)


### Features

* **connect:** dry run feature [#405](https://github.com/permaweb/ao/issues/405) ([e39a89f](https://github.com/permaweb/ao/commit/e39a89fd181394fae4f4bc71bb8c480adf6e9f85))
* **connect:** dryrun [#405](https://github.com/permaweb/ao/issues/405) ([bc75bf4](https://github.com/permaweb/ao/commit/bc75bf4d2e32981d851696672316951a928fc5e2))
* **connect:** dryrun added browser exports [#405](https://github.com/permaweb/ao/issues/405) ([6dbbdf9](https://github.com/permaweb/ao/commit/6dbbdf946c6eb37a4118f0f4273115b8ddfd28a6))
* **connect:** dryrun connector for cu [#405](https://github.com/permaweb/ao/issues/405) ([02019f8](https://github.com/permaweb/ao/commit/02019f8237d704175bf8dfe1a0f8a37d55a49c15))

## [0.0.39](https://github.com/permaweb/ao/compare/connect@v0.0.38...connect@v0.0.39) (2024-01-30)


### Bug Fixes

* jsdocs for typescript [#394](https://github.com/permaweb/ao/issues/394) ([cda5267](https://github.com/permaweb/ao/commit/cda52677b1b3e182b3efd5ccadee9b746ec23698))

## [0.0.38](https://github.com/permaweb/ao/compare/connect@v0.0.37...connect@v0.0.38) (2024-01-28)

## [0.0.37](https://github.com/permaweb/ao/compare/connect@v0.0.36...connect@v0.0.37) (2024-01-28)

## [0.0.36](https://github.com/permaweb/ao/compare/connect@v0.0.35...connect@v0.0.36) (2024-01-24)


### Features

* **connect:** dedupe protocol specific tags on spawn and message ([7e3073e](https://github.com/permaweb/ao/commit/7e3073e372c8efc8a9bf138f80aa34a17f36da53))

## [0.0.35](https://github.com/permaweb/ao/compare/connect@v0.0.34...connect@v0.0.35) (2024-01-23)

## [0.0.34](https://github.com/permaweb/ao/compare/connect@v0.0.33...connect@v0.0.34) (2024-01-22)


### Features

* added results to index.common and fixed issue with Result response [#343](https://github.com/permaweb/ao/issues/343) ([b8ca4e6](https://github.com/permaweb/ao/commit/b8ca4e6dfb7f7955a802d8ed3b99c0b7733014a1))
* added results to index.common and fixed test [#343](https://github.com/permaweb/ao/issues/343) ([25cb33a](https://github.com/permaweb/ao/commit/25cb33ab18ba42ccc4ffd8aaa70065b82bcea0a3))
* **connect:** results method [#343](https://github.com/permaweb/ao/issues/343) ([1bea78b](https://github.com/permaweb/ao/commit/1bea78b4ec6bd05ad2acca23e001ad14eb35943e))

## [0.0.33](https://github.com/permaweb/ao/compare/connect@v0.0.32...connect@v0.0.33) (2024-01-16)

## [0.0.32](https://github.com/permaweb/ao/compare/connect@v0.0.31...connect@v0.0.32) (2024-01-15)


### Features

* add unmonitor feature [#310](https://github.com/permaweb/ao/issues/310) ([bb41e91](https://github.com/permaweb/ao/commit/bb41e9180dfe4d8ee27fd3211501c2c479fdda58))


### Bug Fixes

* resolved conversation for [#316](https://github.com/permaweb/ao/issues/316) ([fd4a577](https://github.com/permaweb/ao/commit/fd4a57750b8151901f4890f278fee432545b4254))

## [0.0.31](https://github.com/permaweb/ao/compare/connect@v0.0.30...connect@v0.0.31) (2024-01-14)

## [0.0.30](https://github.com/permaweb/ao/compare/connect@v0.0.29...connect@v0.0.30) (2024-01-14)


### Bug Fixes

* **connect:** inject dependencies into monitorWith [#314](https://github.com/permaweb/ao/issues/314) [#312](https://github.com/permaweb/ao/issues/312) ([9b257ae](https://github.com/permaweb/ao/commit/9b257ae37b53f930981df05e28d2f91bc7d306d2))

## [0.0.29](https://github.com/permaweb/ao/compare/connect@v0.0.28...connect@v0.0.29) (2024-01-14)


### Features

* add monitor method to connect [#312](https://github.com/permaweb/ao/issues/312) ([5536120](https://github.com/permaweb/ao/commit/5536120665e2d7b8ea178711bf8d75439c9162a2))
* **connect:** set process id as target on monitor data item. Wrap side effect in contract [#312](https://github.com/permaweb/ao/issues/312) ([2fd21ad](https://github.com/permaweb/ao/commit/2fd21ad0727482352925bd1a205121413713ea6a))


### Bug Fixes

* added monitor lib ([1ccb6cf](https://github.com/permaweb/ao/commit/1ccb6cf453e7b07c25dc260585bfbb87fac3e172))

## [0.0.28](https://github.com/permaweb/ao/compare/connect@v0.0.27...connect@v0.0.28) (2024-01-12)


### ⚠ BREAKING CHANGES

* **connect:** update package name from ao-connect -> aoconnect

* **connect:** update package name from ao-connect -> aoconnect ([c0c7b14](https://github.com/permaweb/ao/commit/c0c7b14f614c05c0666b3767249c69e4493969e6))

## [0.0.27](https://github.com/permaweb/ao/compare/connect@v0.0.26...connect@v0.0.27) (2024-01-09)


### Features

* **connect:** use process.env for node and globalThis for browser entrypoint defaults [#294](https://github.com/permaweb/ao/issues/294) ([51a30f3](https://github.com/permaweb/ao/commit/51a30f3dccbcbd65b933cddb88666f39337cbaca))

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
