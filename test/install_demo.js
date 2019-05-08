'use strict';

require('debug').enable('npminstall:*');
const path = require('path');
const npminstall = require('./npminstall');

(async () => {
  await npminstall({
    // install root dir
    root: path.join(__dirname, 'fixtures', 'demo'),
    // optional packages need to install, default is package.json's dependencies and devDependencies
    pkgs: [
      // { name: 'webpack' },
      { name: 'antd' },
      // { name: 'mocha' },
      // { name: 'mocha' },
      // { name: 'express' },
    ],
    // registry, default is https://registry.npmjs.org
    registry: 'https://registry.npm.taobao.org',
    // debug: false,
    // storeDir: root + '.npminstall',
  });
})().catch(err => {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
