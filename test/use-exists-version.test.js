'use strict';

const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const helper = require('./helper');

describe('test/use-exists-version.test.js', () => {
  const cwd = helper.fixtures('try-to-use-one-version');
  const cleanup = helper.cleanup(cwd);

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should replace tarball url to other', async () => {
    await coffee.fork(helper.npminstall, [ '-d', '--flatten' ], { cwd })
      .debug()
      .expect('code', 0)
      .expect('stdout', /All packages installed/)
      .end();
    const pkg = require(path.join(cwd, 'node_modules/@types/react-dom/node_modules/@types/react/package.json'));
    assert(pkg.version === '15.0.4');
  });
});
