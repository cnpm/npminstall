# npminstall

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![appveyor build status][appveyor-image]][appveyor-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/npminstall.svg?style=flat-square
[npm-url]: https://npmjs.org/package/npminstall
[travis-image]: https://img.shields.io/travis/cnpm/npminstall.svg?style=flat-square
[travis-url]: https://travis-ci.org/cnpm/npminstall
[appveyor-image]: https://ci.appveyor.com/api/projects/status/xyn5tj86tvdy4cfe/branch/master?svg=true
[appveyor-url]: https://ci.appveyor.com/project/eggjs/npminstall
[codecov-image]: https://codecov.io/gh/cnpm/npminstall/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/cnpm/npminstall
[david-image]: https://img.shields.io/david/cnpm/npminstall.svg?style=flat-square
[david-url]: https://david-dm.org/cnpm/npminstall
[snyk-image]: https://snyk.io/test/npm/npminstall/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/npminstall
[download-image]: https://img.shields.io/npm/dm/npminstall.svg?style=flat-square
[download-url]: https://npmjs.org/package/npminstall

Let `npm install` fast and easy.

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
$ cnpm install  // will use npminstall
```

#### npminstall

```bash
Usage:

  npminstall
  npminstall <pkg>
  npminstall <pkg>@<tag>
  npminstall <pkg>@<version>
  npminstall <pkg>@<version range>
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

#### npmuninstall

```bash
Usage:

  npmuninstall <pkg>
  npmuninstall <pkg>@<version>
  npmuninstall <pkg>@<version> [<pkg>@<version>]
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
const co = require('co');
const npminstall = require('npminstall');

co(function* () {
  yield npminstall({
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
}).catch(err => {
  console.error(err.stack);
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
- [x] node-gyp
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
