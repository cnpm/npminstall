'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('peer.test.js', () => {
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

  it('should ignore peerDependency if in dependencies', function* () {
    yield coffee.fork(bin, [ 'react-countup@1.3.0' ], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
    assert(getPkg('node_modules/react-countup/node_modules/react/package.json').version.startsWith('15.'));
    const pkg = getPkg('node_modules/react-countup//package.json');
    assert(pkg.dependencies.react === '^15.3.2');
    assert(pkg.peerDependencies.react === '>=0.14.0');
  });
});
