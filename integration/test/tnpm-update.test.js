'use strict';

const path = require('path');
const coffee = require('coffee');
const rimraf = require('rimraf');
const npminstall = path.join(__dirname, '../../../packages/npminstall/bin/install.js');
const npmupdate = path.join(__dirname, '../../../packages/npminstall/bin/update.js');
const fixtures = path.join(__dirname, 'fixtures');

describe('test/tnpm-update.test.js', () => {
  const root = path.join(fixtures, 'update-demo');
  const root2 = path.join(fixtures, 'update-demo-npm');

  before(async () => {
    rimraf.sync(path.join(root, 'node_modules'));
    await coffee.fork(npminstall, {
      cwd: root,
    })
      .debug()
      .expect('code', 0)
      .end();

    rimraf.sync(path.join(root2, 'node_modules'));
    await coffee.fork(npminstall, {
      cwd: root2,
    })
      .debug()
      .expect('code', 0)
      .end();
  });

  it('should with update', () => {
    return coffee.fork(npmupdate, {
      cwd: root,
    })
      .debug()
      .expect('stdout', /\[npmupdate\] removing /)
      .expect('stdout', /\[npmupdate\] reinstall on /)
      .expect('code', 0)
      .end();
  });

  it('should update specify deps', async () => {
    return coffee.fork(npmupdate, [
      'pedding',
    ], {
      cwd: root,
    })
      .debug()
      .expect('stdout', /\[npmupdate\] reinstall on /)
      .expect('code', 0)
      .end();
  });
});
