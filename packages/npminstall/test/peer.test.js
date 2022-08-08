'use strict';

const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const fs = require('fs/promises');
const helper = require('./helper');
const { existsSync } = require('../lib/utils');

describe('test/peer.test.js', () => {
  describe('unmet root and link', () => {
    const tmp = helper.fixtures('antd-tools-ts');
    const cleanup = helper.cleanup(tmp);

    beforeEach(cleanup);
    afterEach(cleanup);

    async function getPkg(subPath) {
      return JSON.parse(await fs.readFile(path.join(tmp, subPath)));
    }

    // will fail on Windows, ignore it
    if (process.platform !== 'win32') {
      it('should use ancestor\'s dependency for peerDependencies', async () => {
        await coffee.fork(helper.npminstall, [], { cwd: tmp })
          .debug()
          .expect('code', 0)
          .end();
        let pkg = await getPkg('node_modules/antd-tools/node_modules/tslint/node_modules/typescript/package.json');
        assert(pkg.version === '2.1.6');
        pkg = await getPkg('node_modules/antd-tools/node_modules/gulp-typescript/node_modules/typescript/package.json');
        assert(pkg.version === '2.1.6');
        pkg = await getPkg('node_modules/antd-tools/node_modules/typescript/package.json');
        assert(pkg.version === '2.1.6');
      });
    }

    it('should ignore peerDependency if in dependencies', async () => {
      await coffee.fork(helper.npminstall, [ 'react-countup@1.3.0' ], { cwd: tmp })
        .debug()
        .expect('code', 0)
        .end();
      let pkg = await getPkg('node_modules/react-countup/node_modules/react/package.json');
      assert(pkg.version.startsWith('15.'));
      pkg = await getPkg('node_modules/react-countup/package.json');
      assert(pkg.dependencies.react === '^15.3.2');
      assert(pkg.peerDependencies.react === '>=0.14.0');
    });
  });

  describe('match root', () => {
    const tmp = helper.fixtures('react-and-react-dom');
    const cleanup = helper.cleanup(tmp);

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should ignore peerDependency match with root', async () => {
      await coffee.fork(helper.npminstall, [], { cwd: tmp })
        .debug()
        .expect('code', 0)
        .end();
      assert(!existsSync(path.join(tmp, 'node_modules/react-dom/node_modules/react')));
      assert(existsSync(path.join(tmp, 'node_modules/react-dom')));
      assert(existsSync(path.join(tmp, 'node_modules/react')));
    });
  });
});
