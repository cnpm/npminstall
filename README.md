# npminstall

[![NPM version][npm-image]][npm-url]
[![Node CI](https://github.com/cnpm/npminstall/actions/workflows/ci.yml/badge.svg)](https://github.com/cnpm/npminstall/actions/workflows/ci.yml)
[![Test coverage][codecov-image]][codecov-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcnpm%2Fnpminstall.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcnpm%2Fnpminstall?ref=badge_shield)

[npm-image]: https://img.shields.io/npm/v/npminstall.svg?style=flat-square
[npm-url]: https://npmjs.org/package/npminstall
[codecov-image]: https://codecov.io/gh/cnpm/npminstall/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/cnpm/npminstall
[snyk-image]: https://snyk.io/test/npm/npminstall/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/npminstall
[download-image]: https://img.shields.io/npm/dm/npminstall.svg?style=flat-square
[download-url]: https://npmjs.org/package/npminstall

Make `npm install` fast and handy.

## Node.js and Python required

- Node.js >= 14.x
- Python >= 3.x

## Use as Cli

### Install

```bash
$ npm install npminstall -g
```

### Usage

#### In cnpm

It is integrated in [cnpm](https://github.com/cnpm/cnpm).

```bash
$ npm install cnpm -g
# will use npminstall
$ cnpm install
```

#### npminstall

```bash
Usage:

  npminstall
  npminstall <pkg>
  npminstall <pkg>@<tag>
  npminstall <pkg>@<version>
  npminstall <pkg>@<version range>
  npminstall <alias>@npm:<name>
  npminstall <folder>
  npminstall <tarball file>
  npminstall <tarball url>
  npminstall <git:// url>
  npminstall <github username>/<github project>

Can specify one or more: npm install ./foo.tgz bar@stable /some/folder
If no argument is supplied, installs dependencies from ./package.json.

Options:

  --production: won't install devDependencies
  --save, --save-dev, --save-optional: save installed dependencies into package.json
  -g, --global: install devDependencies to global directory which specified in `$ npm config get prefix`
  -r, --registry: specify custom registry
  -c, --china: specify in china, will automatically using chinese npm registry and other binary's mirrors
  -d, --detail: show detail log of installation
  --trace: show memory and cpu usages traces of installation
  --ignore-scripts: ignore all preinstall / install and postinstall scripts during the installation
  --no-optional: ignore optionalDependencies during the installation
  --forbidden-licenses: forbit install packages which used these licenses
  --engine-strict: refuse to install (or even consider installing) any package that claims to not be compatible with the current Node.js version.
  --flatten: flatten dependencies by matching ancestors dependencies
  --registry-only: make sure all packages install from registry. Any package is installed from remote(e.g.: git, remote url) cause install fail.
  --cache-strict: use disk cache even on production env
```


[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcnpm%2Fnpminstall.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcnpm%2Fnpminstall?ref=badge_large)

#### npmuninstall

```bash
Usage:

  npmuninstall <pkg>
  npmuninstall <pkg>@<version>
  npmuninstall <pkg>@<version> [<pkg>@<version>]
  npminstall <alias>@npm:<name>
```

#### npmlink

```bash
Usage:

  npmlink <folder>
```

## Use as Lib

### Install

```bash
$ npm install npminstall --save
```

### Usage

```js
const npminstall = require('npminstall');

(async () => {
  await npminstall({
    // install root dir
    root: process.cwd(),
    // optional packages need to install, default is package.json's dependencies and devDependencies
    // pkgs: [
    //   { name: 'foo', version: '~1.0.0' },
    // ],
    // install to specific directory, default to root
    // targetDir: '/home/admin/.global/lib',
    // link bin to specific directory (for global install)
    // binDir: '/home/admin/.global/bin',
    // registry, default is https://registry.npmjs.org
    // registry: 'https://registry.npmjs.org',
    // debug: false,
    // storeDir: root + 'node_modules',
    // ignoreScripts: true, // ignore pre/post install scripts, default is `false`
    // forbiddenLicenses: forbit install packages which used these licenses
  });
})().catch(err => {
  console.error(err);
});
```

## Support Features

- [x] all types of npm package
  - [x] a) a folder containing a program described by a package.json file (`npm install file:eslint-rule`)
  - [x] b) a gzipped tarball containing (a) (`npm install ./rule.tgz`)
  - [x] c) a url that resolves to (b) (`npm install https://github.com/indexzero/forever/tarball/v0.5.6`)
  - [x] d) a <name>@<version> that is published on the registry with (c)
  - [x] e) a <name>@<tag> (see npm-dist-tag) that points to (d)
  - [x] f) a <name> that has a "latest" tag satisfying (e)
  - [x] g) a <git remote url> that resolves to (a) (`npm install git://github.com/timaschew/cogent#fix-redirects`)
- [x] All platform support
- [x] global install (`-g, --global`)
- [x] `preinstall`, `install`, `postinstall` scripts
- [x] node-gyp@9, only support Python@3
  - [x] node-pre-gyp
- [x] bin (yo@1.6.0, fsevents@1.0.6)
- [x] scoped package
- [x] bundleDependencies / bundledDependencies (node-pre-gyp@0.6.19, fsevents@1.0.6)
- [x] optionalDependencies (pm2@1.0.0)
- [x] peerDependencies (co-defer@1.0.0, co-mocha@1.1.2, estraverse-fb@1.3.1)
- [x] deprecate message
- [x] `--production` mode
- [x] `save`, `save-dev`, `save-optional`
- [x] support `ignore-scripts`
- [x] uninstall
- [x] resolutions
- [x] [npm alias](https://github.com/npm/rfcs/blob/latest/implemented/0001-package-aliases.md)

## Different with NPM

This project is inspired by [pnpm](https://github.com/pnpm/pnpm), and has a similar store structure like pnpm. You can read [pnpm vs npm](https://github.com/pnpm/pnpm/blob/master/docs/pnpm-vs-npm.md) to see the different with npm.

### Limitations

- You can't install from [shrinkwrap](https://docs.npmjs.com/cli/shrinkwrap)(and don't want to support for now).
- Peer dependencies are a little trickier to deal with(see rule 1 below).
- You can't publish npm modules with bundleDependencies managed by npminstall(because of rule 2 below).
- `npminstall` will collect all postinstall scripts, and execute them until all dependencies installed.
- If last install failed, better to cleanup node_modules directory before retry.

## `node_modules` directory

Two rules:

1. The latest version of modules will link at `options.storeDir`'s `node_modules`.
2. Module's dependencies will link at module's `node_modules`.

e.g.:

- app: `{ "dependencies": { "debug": "2.2.0" } }` (root)
- debug@2.2.0: `{ "dependencies": { "ms": "0.7.1" } }`

```bash
app/
├── package.json
└── node_modules
    ├── _debug@2.2.0@debug
    │   ├── node_modules
    │   │   └── ms -> ../../_ms@0.7.1@ms
    ├── _ms0.7.1@ms
    ├── debug -> _debug@2.2.0@debug
    └── ms -> _ms@0.7.1@ms # for peerDependencies
```

### flattened vs nested

npminstall will always try to install the maximal matched version of semver:

```
root/
  koa@1.1.0
  mod/
    koa@~1.1.0
# will install two different version of koa when use npminstall.
```

you can enable flatten mode by `--flatten` flag, in this mod, npminstall will try to use ancestors' dependencies to minimize the dependence-tree.

```
root/
  koa@1.1.0
  mod/
    koa@~1.1.0

root/
  koa@1.1.0
  mod/
    koa@^1.1.0
# both the same version: 1.1.0

root/
  koa@~1.1.0
  mod/
    koa@^1.1.0
# both the same version: 1.1.2

root/
  mod/
    koa@^1.1.0
  moe/
    koa@~1.1.0
# two different versions
```

**npminstall will always treat `n.x` and `n.m.x` as flattened**

```
root/
  koa@1.1.0
  mod/
    koa@1.1.x
both the same version: 1.1.0

root/
  koa@~1.1.0
  mod/
    koa@1.x
both the same version: 1.1.2
```

## Resolutions

support [selective version resolutions](https://yarnpkg.com/en/docs/selective-version-resolutions) like yarn. which lets you define custom package versions inside your dependencies through the resolutions field in your `package.json` file.

resolutions also supports [npm alias)(https://docs.npmjs.com/cli/v7/commands/npm-install). It's a workaround feature to fix some archived/inactive/ package by uploading your own bug-fixed version to npm registry.

see use case at [unittest package.json](./test/fixtures/resolutions-alias/package.json).

## Benchmarks

https://github.com/cnpm/npminstall-benchmark

### cnpmjs.org install

- npminstall@1.2.0
- pnpm@0.18.0
- npm@2.14.12

cli | real | user | sys
--- | ---  | ---  | ---
npminstall | 0m10.908s | 0m8.733s | 0m4.282s
npminstall with cache | 0m8.815s | 0m7.492s | 0m3.644s
npminstall --no-cache | 0m10.279s | 0m8.255s | 0m3.932s
pnpm | 0m13.509s | 0m11.650s | 0m4.443s
npm | 0m28.171s | 0m26.085s | 0m8.219s
npm with cache | 0m20.939s | 0m19.415s | 0m6.302s

### pnpm benchmark

see https://github.com/pnpm/pnpm#benchmark

```bash
npminstall babel-preset-es2015 browserify chalk debug minimist mkdirp
    real	0m8.929s       user	0m5.606s       sys	0m2.913s
```

```bash
pnpm i babel-preset-es2015 browserify chalk debug minimist mkdirp
    real	0m12.998s      user	0m8.653s       sys	0m3.362s
```

```bash
npm i babel-preset-es2015 browserify chalk debug minimist mkdirp
    real	1m4.729s       user	0m55.589s      sys	0m23.135s
```

## License

[MIT](LICENSE.txt)
<!-- GITCONTRIBUTOR_START -->

## Contributors

|[<img src="https://avatars.githubusercontent.com/u/156269?v=4" width="100px;"/><br/><sub><b>fengmk2</b></sub>](https://github.com/fengmk2)<br/>|[<img src="https://avatars.githubusercontent.com/u/985607?v=4" width="100px;"/><br/><sub><b>dead-horse</b></sub>](https://github.com/dead-horse)<br/>|[<img src="https://avatars.githubusercontent.com/u/4635838?v=4" width="100px;"/><br/><sub><b>gemwuu</b></sub>](https://github.com/gemwuu)<br/>|[<img src="https://avatars.githubusercontent.com/u/543405?v=4" width="100px;"/><br/><sub><b>ibigbug</b></sub>](https://github.com/ibigbug)<br/>|[<img src="https://avatars.githubusercontent.com/u/6897780?v=4" width="100px;"/><br/><sub><b>killagu</b></sub>](https://github.com/killagu)<br/>|[<img src="https://avatars.githubusercontent.com/u/507615?v=4" width="100px;"/><br/><sub><b>afc163</b></sub>](https://github.com/afc163)<br/>|
| :---: | :---: | :---: | :---: | :---: | :---: |
|[<img src="https://avatars.githubusercontent.com/u/465125?v=4" width="100px;"/><br/><sub><b>yesmeck</b></sub>](https://github.com/yesmeck)<br/>|[<img src="https://avatars.githubusercontent.com/u/6828924?v=4" width="100px;"/><br/><sub><b>vagusX</b></sub>](https://github.com/vagusX)<br/>|[<img src="https://avatars.githubusercontent.com/u/360661?v=4" width="100px;"/><br/><sub><b>popomore</b></sub>](https://github.com/popomore)<br/>|[<img src="https://avatars.githubusercontent.com/u/319494?v=4" width="100px;"/><br/><sub><b>we11adam</b></sub>](https://github.com/we11adam)<br/>|[<img src="https://avatars.githubusercontent.com/u/7463687?v=4" width="100px;"/><br/><sub><b>whatwewant</b></sub>](https://github.com/whatwewant)<br/>|[<img src="https://avatars.githubusercontent.com/u/18736572?v=4" width="100px;"/><br/><sub><b>emma-owen</b></sub>](https://github.com/emma-owen)<br/>|
|[<img src="https://avatars.githubusercontent.com/u/7336582?v=4" width="100px;"/><br/><sub><b>weihong1028</b></sub>](https://github.com/weihong1028)<br/>|[<img src="https://avatars.githubusercontent.com/u/49113249?v=4" width="100px;"/><br/><sub><b>HomyeeKing</b></sub>](https://github.com/HomyeeKing)<br/>|[<img src="https://avatars.githubusercontent.com/u/2972143?v=4" width="100px;"/><br/><sub><b>nightink</b></sub>](https://github.com/nightink)<br/>|[<img src="https://avatars.githubusercontent.com/u/2842176?v=4" width="100px;"/><br/><sub><b>XadillaX</b></sub>](https://github.com/XadillaX)<br/>|[<img src="https://avatars.githubusercontent.com/u/1195765?v=4" width="100px;"/><br/><sub><b>LeoYuan</b></sub>](https://github.com/LeoYuan)<br/>|[<img src="https://avatars.githubusercontent.com/u/13602053?v=4" width="100px;"/><br/><sub><b>cnlon</b></sub>](https://github.com/cnlon)<br/>|
|[<img src="https://avatars.githubusercontent.com/u/6613538?v=4" width="100px;"/><br/><sub><b>Moudicat</b></sub>](https://github.com/Moudicat)<br/>|[<img src="https://avatars.githubusercontent.com/u/6753092?v=4" width="100px;"/><br/><sub><b>hanzhao</b></sub>](https://github.com/hanzhao)<br/>|[<img src="https://avatars.githubusercontent.com/u/431376?v=4" width="100px;"/><br/><sub><b>marcbachmann</b></sub>](https://github.com/marcbachmann)<br/>|[<img src="https://avatars.githubusercontent.com/u/19733683?v=4" width="100px;"/><br/><sub><b>snyk-bot</b></sub>](https://github.com/snyk-bot)<br/>|[<img src="https://avatars.githubusercontent.com/u/11251401?v=4" width="100px;"/><br/><sub><b>Solais</b></sub>](https://github.com/Solais)<br/>|[<img src="https://avatars.githubusercontent.com/u/958063?v=4" width="100px;"/><br/><sub><b>thonatos</b></sub>](https://github.com/thonatos)<br/>|
|[<img src="https://avatars.githubusercontent.com/u/227713?v=4" width="100px;"/><br/><sub><b>atian25</b></sub>](https://github.com/atian25)<br/>|[<img src="https://avatars.githubusercontent.com/u/3364271?v=4" width="100px;"/><br/><sub><b>tommytroylin</b></sub>](https://github.com/tommytroylin)<br/>|[<img src="https://avatars.githubusercontent.com/u/3922719?v=4" width="100px;"/><br/><sub><b>wssgcg1213</b></sub>](https://github.com/wssgcg1213)<br/>|[<img src="https://avatars.githubusercontent.com/u/4136679?v=4" width="100px;"/><br/><sub><b>yibn2008</b></sub>](https://github.com/yibn2008)<br/>|[<img src="https://avatars.githubusercontent.com/u/29791463?v=4" width="100px;"/><br/><sub><b>fossabot</b></sub>](https://github.com/fossabot)<br/>|[<img src="https://avatars.githubusercontent.com/u/1908773?v=4" width="100px;"/><br/><sub><b>hugohua</b></sub>](https://github.com/hugohua)<br/>|
[<img src="https://avatars.githubusercontent.com/u/19908330?v=4" width="100px;"/><br/><sub><b>hyj1991</b></sub>](https://github.com/hyj1991)<br/>|[<img src="https://avatars.githubusercontent.com/u/13431452?v=4" width="100px;"/><br/><sub><b>givingwu</b></sub>](https://github.com/givingwu)<br/>|[<img src="https://avatars.githubusercontent.com/u/1196941?v=4" width="100px;"/><br/><sub><b>Abreto</b></sub>](https://github.com/Abreto)<br/>

This project follows the git-contributor [spec](https://github.com/xudafeng/git-contributor), auto updated at `Fri Mar 25 2022 00:03:37 GMT+0800`.

<!-- GITCONTRIBUTOR_END -->
