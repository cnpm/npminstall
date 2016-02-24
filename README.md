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

## `node_modules` directory

Two rules:

- The latest version of modules will link at `options.storeDir`'s `node_modules`.
- Module's dependencies will link at module's `node_modules`.

e.g.:

- app: `{ "dependencies": { "a": "1.0.0" } }` (root)
- a@1.0.0: `{ "dependencies": { "c": "2.0.0", "b": "1.0.0" } }`
- b@1.0.0: `{ "dependencies": { "c": "1.0.0" } }`
- c@1.0.0 & c@2.0.0: `{ "dependencies": { } }`

```bash
app/
├── package.json
└── node_modules/
    ├── .npminstall/
    │   ├── a/
    │   │   └── 1.0.0/
    │   │       ├── package.json
    │   │       └── node_modules/
    │   │           ├── b -> ../../../b/1.0.0
    │   │           └── c -> ../../../c/2.0.0
    │   ├── b/
    │   │   └── 1.0.0/
    │   │       ├── package.json
    │   │       └── node_modules/
    │   │           └── c -> ../../../c/1.0.0
    │   ├── c/
    │   │   ├── 1.0.0/
    │   │       └── package.json
    │   │   └── 2.0.0/
    │   │       └── package.json
    │   └── node_modules/
    │       ├── b -> ../b/1.0.0 (latest version)
    │       └── c -> ../c/2.0.0 (latest version)
    └── a -> .npminstall/a/1.0.0
```

`a@1.0.0` is root package, won't create link at `app/node_modules/.npminstall/node_modules/a@`.

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
