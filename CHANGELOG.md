# Changelog

## [7.1.0](https://github.com/cnpm/npminstall/compare/v7.0.0...v7.1.0) (2023-01-02)


### Features

* try to set authorization from ~/.npmrc ([#432](https://github.com/cnpm/npminstall/issues/432)) ([631029b](https://github.com/cnpm/npminstall/commit/631029be35e871ddad0bd284565b595dd791cfac))

## [7.0.0](https://github.com/cnpm/npminstall/compare/v6.6.2...v7.0.0) (2023-01-01)


### ⚠ BREAKING CHANGES

* force set disableDedupe=true by default, say good bye
to hoist.

### Code Refactoring

* Store package to node_modules/.store dir ([#429](https://github.com/cnpm/npminstall/issues/429)) ([6dd0b64](https://github.com/cnpm/npminstall/commit/6dd0b64c5598fb9ffd9a03fb1cc8355088e36f96))
