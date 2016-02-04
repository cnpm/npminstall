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

## License

[MIT](LICENSE)
