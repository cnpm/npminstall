# npminstall

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![appveyor build status][appveyor-image]][appveyor-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/npminstall.svg?style=flat-square
[npm-url]: https://npmjs.org/package/npminstall
[travis-image]: https://img.shields.io/travis/cnpm/npminstall.svg?style=flat-square
[travis-url]: https://travis-ci.org/cnpm/npminstall
[appveyor-image]: https://ci.appveyor.com/api/projects/status/9x637qe09ivo8g2h?svg=true
[appveyor-url]: https://ci.appveyor.com/project/fengmk2/npminstall
[codecov-image]: https://codecov.io/github/cnpm/npminstall/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/cnpm/npminstall?branch=master
[david-image]: https://img.shields.io/david/cnpm/npminstall.svg?style=flat-square
[david-url]: https://david-dm.org/cnpm/npminstall
[download-image]: https://img.shields.io/npm/dm/npminstall.svg?style=flat-square
[download-url]: https://npmjs.org/package/npminstall

Let `npm install` fast and easy.

## Installation

```bash
$ npm install npminstall --save
```

## Quick start

```js
const co = require('co');
const npminstall = require('npminstall');

co(function*() {
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
    // storeDir: root + '.npminstall',
  });
}).catch(function(err) {
  console.error(err.stack);
});
```

## Support Features

- [x] global install (`-g, --global`)
- [x] postinstall script
  - [x] support Windows
- [x] node-gyp
  - [x] node-pre-gyp
- [x] bin (yo@1.6.0, fsevents@1.0.6)
- [x] scoped package
- [x] bundleDependencies / bundledDependencies (node-pre-gyp@0.6.19, fsevents@1.0.6)
- [x] optionalDependencies (pm2@1.0.0)
- [x] peerDependencies (co-defer@1.0.0, co-mocha@1.1.2, estraverse-fb@1.3.1)
- [x] deprecate message
- [x] `--production` mode
- [x] cleanup when install failed
- all types of npm package
  - [x] a) a folder containing a program described by a package.json file (`npm install file:eslint-rule`)
  - [x] b) a gzipped tarball containing (a) (`npm install ./rule.tgz`)
  - [x] c) a url that resolves to (b) (`npm install https://github.com/indexzero/forever/tarball/v0.5.6`)
  - [x] d) a <name>@<version> that is published on the registry with (c)
  - [x] e) a <name>@<tag> (see npm-dist-tag) that points to (d)
  - [x] f) a <name> that has a "latest" tag satisfying (e)
  - [x] g) a <git remote url> that resolves to (a) (`npm install git://github.com/timaschew/cogent#fix-redirects`)
- [x] `save`, `save-dev`, `save-optional`

## Different with NPM

This project is inspired by [pnpm](https://github.com/rstacruz/pnpm), and has a similar store structure like pnpm. You can read [pnpm vs npm](https://github.com/rstacruz/pnpm/blob/master/docs/vs-npm.md) to see the different with npm.

### Limitations

- You can't install from [shrinkwrap](https://docs.npmjs.com/cli/shrinkwrap)(and don't want to support for now).
- Peer dependencies are a little trickier to deal with(see rule 1 below).
- You can't publish npm modules with bundleDependencies managed by npminstall(because of rule 2 below).

## `node_modules` directory

Two rules:

1. The latest version of modules will link at `options.storeDir`'s `node_modules`.
2. Module's dependencies will link at module's `node_modules`.

e.g.:

- app: `{ "dependencies": { "a": "1.0.0" } }` (root)
- a@1.0.0: `{ "dependencies": { "c": "2.0.0", "b": "1.0.0" } }`
- b@1.0.0: `{ "dependencies": { "c": "1.0.0" } }`
- c@1.0.0 & c@2.0.0: `{ "dependencies": { } }`

```bash
app/
└── node_modules/
    ├── .npminstall/
    │   ├── debug/
    │   │   └── 2.2.0/
    │   │       └── debug/
    │   │           └──  node_modules/
    │   │               └── ms -> ../../../../ms/0.7.1/ms
    │   ├── ms/
    │   │   ├── 0.5.1/
    │   │   │   └── ms/
    │   │   └── 0.7.1/
    │   │       └── ms/
    │   └── node_modules/
    │       └── ms -> ../ms/0.7.1/ms
    ├── debug -> .npminstall/debug/2.2.0/debug
    └── ms -> .npminstall/ms/0.5.1/ms
```

`debug@1.0.0` is root package, won't create link at `app/node_modules/.npminstall/node_modules/debug@`.

## Benchmarks

- npminstall@0.7.0
- pnpm@0.18.0
- npm@2.14.12

cli | real | user | sys
--- | ---  | ---  | ---
npminstall | 0m13.808s | 0m9.679s | 0m4.854s
npminstall with cache | 0m11.712s | 0m8.769s | 0m4.377s
npminstall --no-cache | 0m11.778s | 0m9.179s | 0m4.358s
pnpm | 0m17.991s | 0m13.847s | 0m5.205s
npm | 0m34.436s | 0m30.282s | 0m9.759s
npm with cache | 0m36.533s | 0m24.625s | 0m7.562s

## License

[MIT](LICENSE)
