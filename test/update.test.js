const assert = require('assert');
const path = require('path');
const coffee = require('coffee');
const helper = require('./helper');
const { exists } = require('../lib/utils');

describe('test/update.test.js', () => {
  const npmupdate = path.join(__dirname, '../bin/update.js');
  const cwd = helper.fixtures('update');
  const cleanup = helper.cleanup(cwd);

  beforeEach(async () => {
    await cleanup();
    await coffee.fork(helper.npminstall, [], {
      cwd,
      stdio: 'pipe',
    })
      .debug()
      .end();
  });
  afterEach(cleanup);

  it('should update ok', async () => {
    await coffee.fork(npmupdate, [], {
      cwd,
      stdio: 'pipe',
    })
      .debug()
      .end();
    assert(await exists(path.join(cwd, 'node_modules/pedding')));
    assert(await exists(path.join(cwd, 'node_modules/pkg')));
  });

  it('should update pedding ok', async () => {
    await coffee.fork(npmupdate, [ 'pedding' ], {
      cwd,
      stdio: 'pipe',
    })
      .debug()
      .end();
    assert(await exists(path.join(cwd, 'node_modules/pedding')));
    assert(await exists(path.join(cwd, 'node_modules/pkg')));
  });
});
