'use strict';

const coffee = require('coffee');
const rimraf = require('rimraf');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('flatten-types.test.js', () => {
  const tmp = path.join(__dirname, 'fixtures', 'types');
  const bin = path.join(__dirname, '../bin/install.js');

  function getPkg(subPath) {
    return JSON.parse(fs.readFileSync(path.join(tmp, subPath)));
  }

  function cleanup() {
    rimraf.sync(path.join(tmp, 'node_modules'));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should flatten when name starts with @types/', function* () {
    yield coffee.fork(bin, [], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
    assert(getPkg('node_modules/@types/react/package.json').version === '0.14.57');
    assert(getPkg('node_modules/@types/react-dom/node_modules/@types/react/package.json').version === '0.14.57');
  });
});
