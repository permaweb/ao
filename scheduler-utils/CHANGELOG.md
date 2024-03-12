# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.14](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.13...scheduler-utils@v0.0.14) (2024-03-12)

## [0.0.13](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.12...scheduler-utils@v0.0.13) (2024-03-11)


### Bug Fixes

* cannot assign to read only property 'name' on scheduler errors ([27f7486](https://github.com/permaweb/ao/commit/27f7486e119cec80b0ee0a6655d8533fbc4302aa))
* **scheduler-utils:** do not set name in error constructor to prevent breaking change ([3b0c9d7](https://github.com/permaweb/ao/commit/3b0c9d7dbdcf42e1db27c57694e1af561a03be50))

## [0.0.12](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.11...scheduler-utils@v0.0.12) (2024-03-06)

## [0.0.11](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.10...scheduler-utils@v0.0.11) (2024-03-04)

## [0.0.10](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.9...scheduler-utils@v0.0.10) (2024-02-12)


### Features

* **mu:** pull From-Module tag from process data [#270](https://github.com/permaweb/ao/issues/270) ([03d4fd4](https://github.com/permaweb/ao/commit/03d4fd43b09a46325bc50b4c52d7d93781f3f620))


### Bug Fixes

* **mu:** remove ttl from lru cache [#270](https://github.com/permaweb/ao/issues/270) ([b12602d](https://github.com/permaweb/ao/commit/b12602d9a93df75dae5d6a50aa8c8bb546689adc))
* **scheduler-utils:** fix accidental change in scheduler utils ([9118b1d](https://github.com/permaweb/ao/commit/9118b1d393390c3bfc59220f191ddb7102499766))
* **scheduler-utils:** only cache origin in Location header when following redirects [#454](https://github.com/permaweb/ao/issues/454) ([c5893d0](https://github.com/permaweb/ao/commit/c5893d065f685ec58c4b415610189905cc2031ff))

## [0.0.9](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.8...scheduler-utils@v0.0.9) (2024-02-07)


### Features

* **scheduler-utils:** cache redirected url ([fbf81a1](https://github.com/permaweb/ao/commit/fbf81a104e1af1b7c57496b3cd83ce8ae40c460d))

## [0.0.8](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.7...scheduler-utils@v0.0.8) (2024-01-10)


### Features

* **scheduler-utils:** expose domain errors and add documentation in README ([b5450d6](https://github.com/permaweb/ao/commit/b5450d66a76a79d223ecf941d59cab4502bc0ac4))

## [0.0.7](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.6...scheduler-utils@v0.0.7) (2023-12-21)


### Bug Fixes

* **scheduler-utils:** cache and return correct shape ([931dd94](https://github.com/permaweb/ao/commit/931dd94f392cd1b8e075f2180df6463dec66f9b1))
* **scheduler-utils:** only return url on raw ([f8ccc17](https://github.com/permaweb/ao/commit/f8ccc17f93575e83003502be193f93de42ffbf17))

## [0.0.6](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.5...scheduler-utils@v0.0.6) (2023-12-20)


### Features

* **scheduler-utils:** add address to return. remove setTimeouts in favor of lru-cache ttl ([8c7467e](https://github.com/permaweb/ao/commit/8c7467efd77357befa7aaa62cc0f6917bde480b4))

## [0.0.5](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.4...scheduler-utils@v0.0.5) (2023-12-19)


### Features

* **scheduler-utils:** more informative error message when transaction not found on gateway ([f4515ed](https://github.com/permaweb/ao/commit/f4515ed82d814117696e98fe19dcc670311802c8))

## [0.0.4](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.3...scheduler-utils@v0.0.4) (2023-12-18)


### ⚠ BREAKING CHANGES

* **scheduler-utils:** return { url } from validate if found instead of boolean

* **scheduler-utils:** return { url } from validate if found instead of boolean ([dcb575f](https://github.com/permaweb/ao/commit/dcb575fb5e8c29e40e85f5e5e147e30a874e0c29))


### Features

* **scheduler-utils:** add raw api ([cd4d846](https://github.com/permaweb/ao/commit/cd4d846204310cd4fd589c1eca5bf774f8cd49c5))

## [0.0.3](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.2...scheduler-utils@v0.0.3) (2023-12-13)


### Bug Fixes

* **scheduler-utils:** ensure validate returns false on InvalidSchedulerLocation [#219](https://github.com/permaweb/ao/issues/219) ([3c2bad9](https://github.com/permaweb/ao/commit/3c2bad94e0089d3abd1b6e522ee9e4ebd1be6c53))

## [0.0.2](https://github.com/permaweb/ao/compare/scheduler-utils@v0.0.1...scheduler-utils@v0.0.2) (2023-12-13)

## 0.0.1 (2023-12-13)


### Features

* **scheduler-utils:** initial impl of ao scheduler utils [#219](https://github.com/permaweb/ao/issues/219) ([a5c1040](https://github.com/permaweb/ao/commit/a5c1040a0d8c85859e9e717e0dbad2a1fc036b5b))
