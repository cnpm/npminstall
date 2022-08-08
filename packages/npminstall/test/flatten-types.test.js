'use strict';

const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const fs = require('fs/promises');
const helper = require('./helper');

describe('test/flatten-types.test.js', () => {
  const tmp = helper.fixtures('types');
  const cleanup = helper.cleanup(tmp);

  async function getPkg(subPath) {
    return JSON.parse(await fs.readFile(path.join(tmp, subPath)));
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should flatten when name starts with @types/', async () => {
    await coffee.fork(helper.npminstall, [], { cwd: tmp })
      .debug()
      .expect('code', 0)
      .end();
    let pkg = await getPkg('node_modules/@types/react/package.json');
    assert(pkg.version === '0.14.57');
    pkg = await getPkg('node_modules/@types/react-dom/node_modules/@types/react/package.json');
    assert(pkg.version === '0.14.57');
  });
});
