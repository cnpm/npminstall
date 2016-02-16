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
    // registry, default is https://registry.npmjs.org
    // registry: 'https://registry.npmjs.org',
    // debug: false,
    // storeDir: root + '.npminstall',
  });
}).catch(function(err) {
  console.error(err.stack);
});
```

## node_modules

Two rules:

- The latest version of modules will link at `options.storeDir`'s `node_modules`.
- Module's dependencies will link at module's `node_modules`.

e.g.:

- app: `{ "dependencies": { "a": "1.0.0" } }` (root)
- a@1.0.0: `{ "dependencies": { "c": "2.0.0", "b": "1.0.0" } }`
- b@1.0.0: `{ "dependencies": { "c": "1.0.0" } }`

```bash
app/package.json
app/node_modules/.npminstall/a/1.0.0
app/node_modules/.npminstall/a/1.0.0/node_modules/c@ -> ../../../c/2.0.0
app/node_modules/.npminstall/a/1.0.0/node_modules/b@ -> ../../../b/1.0.0
app/node_modules/.npminstall/b/1.0.0
app/node_modules/.npminstall/b/1.0.0/node_modules/c@ -> ../../../c/1.0.0
app/node_modules/.npminstall/c/1.0.0
app/node_modules/.npminstall/c/2.0.0
app/node_modules/a@ -> .npminstall/a/1.0.0
app/node_modules/.npminstall/node_modules/b@ -> ../b/1.0.0 (latest version)
app/node_modules/.npminstall/node_modules/c@ -> ../c/2.0.0 (latest version)
```

`a@1.0.0` is root package, won't create link at `app/node_modules/.npminstall/node_modules/a@`.

## Benchmarks

- npminstall@0.6.0
- pnpm@0.18.0
- npm@2.14.12

cli | real | user | sys
--- | ---  | ---  | ---
npminstall | 0m13.805s | 0m10.060s | 0m4.956s
npminstall with cache | 0m12.285s | 0m9.077s | 0m4.443s
npminstall --no-cache | 0m13.583s | 0m9.579s | 0m4.423s
pnpm | 0m16.323s | 0m13.132s | 0m5.014s
npm | 0m45.721s | 0m31.606s | 0m9.842s
npm with cache | 0m30.427s | 0m26.670s | 0m7.821s

## License

[MIT](LICENSE)
