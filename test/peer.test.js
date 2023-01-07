const path = require('path');
const assert = require('assert');
const fs = require('fs/promises');
const coffee = require('coffee');
const assertFile = require('assert-file');
const helper = require('./helper');

describe('test/peer.test.js', () => {
  async function getPkg(root, subPath) {
    return JSON.parse(await fs.readFile(path.join(root, subPath)));
  }

  describe('unmet root and link', () => {
    const tmp = helper.fixtures('antd-tools-ts');
    const cleanup = helper.cleanup(tmp);

    beforeEach(cleanup);

    // will fail on Windows, ignore it
    if (process.platform !== 'win32') {
      it('should use ancestor\'s dependency for peerDependencies', async () => {
        await coffee.fork(helper.npminstall, [], { cwd: tmp })
          .debug()
          .expect('code', 0)
          .end();
        let pkg = await getPkg(tmp, 'node_modules/antd-tools/package.json');
        assert(pkg);
        pkg = await getPkg(tmp, `node_modules/.store/antd-tools@${pkg.version}/node_modules/tslint/package.json`);
        assert(pkg);
        pkg = await getPkg(tmp, `node_modules/.store/tslint@${pkg.version}/node_modules/typescript/package.json`);
        assert(pkg.version === '2.1.6');

        pkg = await getPkg(tmp, 'node_modules/antd-tools/package.json');
        pkg = await getPkg(tmp, `node_modules/.store/antd-tools@${pkg.version}/node_modules/gulp-typescript/package.json`);
        assert(pkg);
        pkg = await getPkg(tmp, `node_modules/.store/gulp-typescript@${pkg.version}/node_modules/typescript/package.json`);
        assert(pkg.version === '2.1.6');

        pkg = await getPkg(tmp, 'node_modules/antd-tools/package.json');
        pkg = await getPkg(tmp, `node_modules/.store/antd-tools@${pkg.version}/node_modules/typescript/package.json`);
        assert(pkg.version === '2.1.6');
      });
    }

    it('should ignore peerDependency if in dependencies', async () => {
      await coffee.fork(helper.npminstall, [ 'react-countup@1.3.0' ], { cwd: tmp })
        .debug()
        .expect('code', 0)
        .end();
      let pkg = await getPkg(tmp, 'node_modules/react-countup/package.json');
      assert(pkg.dependencies.react === '^15.3.2');
      assert(pkg.peerDependencies.react === '>=0.14.0');
      pkg = await getPkg(tmp, `node_modules/.store/react-countup@${pkg.version}/node_modules/react/package.json`);
      assert(pkg.version.startsWith('15.'));
    });
  });

  describe('match root', () => {
    const tmp = helper.fixtures('react-and-react-dom');
    const cleanup = helper.cleanup(tmp);
    beforeEach(cleanup);

    it('should link peerDependency match with root too', async () => {
      await coffee.fork(helper.npminstall, [], { cwd: tmp })
        .debug()
        .expect('code', 0)
        .end();
      const pkg = await getPkg(tmp, 'node_modules/react-dom/package.json');
      assertFile(path.join(tmp, `node_modules/.store/react-dom@${pkg.version}/node_modules/react`));
      assertFile(path.join(tmp, 'node_modules/react-dom'));
      assertFile(path.join(tmp, 'node_modules/react'));
    });
  });
});
