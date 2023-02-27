# Changelog

## [7.5.1](https://github.com/cnpm/npminstall/compare/v7.5.0...v7.5.1) (2023-02-27)


### Bug Fixes

* link public hoist package to `<workspaceRoot>/node_modules` ([#450](https://github.com/cnpm/npminstall/issues/450)) ([ad7528f](https://github.com/cnpm/npminstall/commit/ad7528f6cab49ac21b2391e1490a54d229821fc6))

## [7.5.0](https://github.com/cnpm/npminstall/compare/v7.4.2...v7.5.0) (2023-02-13)


### Features

* installation lifecycle scripts ([#448](https://github.com/cnpm/npminstall/issues/448)) ([f48e7e3](https://github.com/cnpm/npminstall/commit/f48e7e3cb81d5e29904feaea26d5b128beab630d))

## [7.4.2](https://github.com/cnpm/npminstall/compare/v7.4.1...v7.4.2) (2023-02-05)


### Bug Fixes

* show warn message when bin file not exists ([#447](https://github.com/cnpm/npminstall/issues/447)) ([0e3741a](https://github.com/cnpm/npminstall/commit/0e3741a94605389a120267f3dc946ccca285f325))

## [7.4.1](https://github.com/cnpm/npminstall/compare/v7.4.0...v7.4.1) (2023-01-28)


### Bug Fixes

* ignore anti semver tips on `<name>@*` deps ([#446](https://github.com/cnpm/npminstall/issues/446)) ([317bcbb](https://github.com/cnpm/npminstall/commit/317bcbb481c814db47cb14ded4792ea41382c108))

## [7.4.0](https://github.com/cnpm/npminstall/compare/v7.3.1...v7.4.0) (2023-01-14)


### Features

* store all latest version packages to .store/node_modules ([#443](https://github.com/cnpm/npminstall/issues/443)) ([71fd1e6](https://github.com/cnpm/npminstall/commit/71fd1e683cbee9c60c3b2c1d21c27d3365ff5573))

## [7.3.1](https://github.com/cnpm/npminstall/compare/v7.3.0...v7.3.1) (2023-01-10)


### Bug Fixes

* add NODE_PATH on shim bin ([#440](https://github.com/cnpm/npminstall/issues/440)) ([93309ef](https://github.com/cnpm/npminstall/commit/93309ef178edb67f4ee2677359885a0e1fc726ba))

## [7.3.0](https://github.com/cnpm/npminstall/compare/v7.2.2...v7.3.0) (2023-01-08)


### Features

* support peerDependenciesMeta ([#437](https://github.com/cnpm/npminstall/issues/437)) ([add0061](https://github.com/cnpm/npminstall/commit/add006158f848fb7e298bc933f4947f0e4088556))
* support peerDependenciesMeta ([#437](https://github.com/cnpm/npminstall/issues/437)) ([848f6fc](https://github.com/cnpm/npminstall/commit/848f6fc1225412a1ad4c64c9285fb8aa55224f83))

## [7.2.2](https://github.com/cnpm/npminstall/compare/v7.2.1...v7.2.2) (2023-01-07)


### Bug Fixes

* store packages on workspace root node_modules ([#435](https://github.com/cnpm/npminstall/issues/435)) ([b86b545](https://github.com/cnpm/npminstall/commit/b86b545e3df9e9917c0464f607caec821cafda53))

## [7.2.1](https://github.com/cnpm/npminstall/compare/v7.2.0...v7.2.1) (2023-01-06)


### Bug Fixes

* auto set INIT_CWD env on install scripts ([#434](https://github.com/cnpm/npminstall/issues/434)) ([d69cf2b](https://github.com/cnpm/npminstall/commit/d69cf2b0984ca1a9238037bb1cf54d6c9acd9cdd))

## [7.2.0](https://github.com/cnpm/npminstall/compare/v7.1.0...v7.2.0) (2023-01-05)


### Features

* support npm workspaces ([#433](https://github.com/cnpm/npminstall/issues/433)) ([a5d248e](https://github.com/cnpm/npminstall/commit/a5d248e0fc5d21af1dbb71acd2ed5cac76ab4f27))

## [7.1.0](https://github.com/cnpm/npminstall/compare/v7.0.0...v7.1.0) (2023-01-02)


### Features

* try to set authorization from ~/.npmrc ([#432](https://github.com/cnpm/npminstall/issues/432)) ([631029b](https://github.com/cnpm/npminstall/commit/631029be35e871ddad0bd284565b595dd791cfac))

## [7.0.0](https://github.com/cnpm/npminstall/compare/v6.6.2...v7.0.0) (2023-01-01)


### ⚠ BREAKING CHANGES

* force set disableDedupe=true by default, say good bye
to hoist.

### Code Refactoring

* Store package to node_modules/.store dir ([#429](https://github.com/cnpm/npminstall/issues/429)) ([6dd0b64](https://github.com/cnpm/npminstall/commit/6dd0b64c5598fb9ffd9a03fb1cc8355088e36f96))
