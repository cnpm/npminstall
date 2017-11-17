'use strict';

const path = require('path');
const coffee = require('coffee');
const rimraf = require('rimraf');
const npminstall = path.join(__dirname, '..', 'bin', 'install.js');

describe('test/install-custom-binary-mirror-config.test.js', () => {
  function cleanup(cwd) {
    rimraf.sync(path.join(cwd, 'node_modules', '.npminstall.done'));
    rimraf.sync(path.join(cwd, 'node_modules', '.package_versions.json'));
  }

  const cwd = path.join(__dirname, 'fixtures', 'custom-binary-mirror-config');
  before(() => cleanup(cwd));
  after(() => cleanup(cwd));

  it('should install with --custom-binary-mirror-config=file', () => {
    return coffee.fork(npminstall, [ '-c', `--custom-binary-mirror-config=${path.join(cwd, 'config.json')}` ], { cwd })
      // .debug()
      .expect('code', 0)
      .expect('stdout', /https:\/\/mynodejs\.org/)
      .end();
  });

  it('should install with --custom-binary-mirror-config=not-exists-file', () => {
    return coffee.fork(npminstall, [ '-c', `--custom-binary-mirror-config=${path.join(cwd, 'config-foo.json')}` ], { cwd })
      // .debug()
      .expect('code', 0)
      .expect('stdout', /https:\/\/npm\.taobao\.org\/mirrors\/node/)
      .end();
  });

  it('should install with --custom-binary-mirror-config=wrong-format-file', () => {
    return coffee.fork(npminstall, [ '-c', `--custom-binary-mirror-config=${path.join(cwd, 'config-wrong-format.json')}` ], { cwd })
      // .debug()
      .expect('code', 0)
      .expect('stdout', /https:\/\/npm\.taobao\.org\/mirrors\/node/)
      .end();
  });

  it('should install with --custom-binary-mirror-config=wrong-format2-file', () => {
    return coffee.fork(npminstall, [ '-c', `--custom-binary-mirror-config=${path.join(cwd, 'config-wrong-format2.json')}` ], { cwd })
      // .debug()
      .expect('code', 0)
      .expect('stdout', /https:\/\/npm\.taobao\.org\/mirrors\/node/)
      .end();
  });
});
