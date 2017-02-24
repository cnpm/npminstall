'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe.only('peer.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'peer');
  const bin = path.join(__dirname, '../bin/install.js');

  function getPkg(subPath) {
    return JSON.parse(fs.readFileSync(path.join(tmp, subPath)));
  }

  function cleanup() {
    rimraf.sync(path.join(tmp, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should use ancestor\'s dependency for peerDependencies', function* () {
    yield coffee.fork(bin, [], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
    assert(getPkg('node_modules/antd-tools/node_modules/tslint/node_modules/typescript/package.json').version === '2.1.6');
    assert(getPkg('node_modules/antd-tools/node_modules/gulp-typescript/node_modules/typescript/package.json').version === '2.1.6');
    assert(getPkg('node_modules/antd-tools/node_modules/typescript/package.json').version === '2.1.6');
  });
});
