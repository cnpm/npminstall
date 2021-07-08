'use strict';

const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const fs = require('mz/fs');
const helper = require('./helper');
const semver = require('semver');

describe('test/peer.test.js', () => {
  describe('unmet root and link', () => {
    const tmp = helper.fixtures('antd-tools-ts');
    const cleanup = helper.cleanup(tmp);

    beforeEach(cleanup);
    afterEach(cleanup);

    async function getPkg(subPath) {
      return JSON.parse(await fs.readFile(path.join(tmp, subPath)));
    }

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

  describe('skip peer dependencies installation', () => {
    const tmp = helper.fixtures('skip-peer-dependencies-installation');
    const cleanup = helper.cleanup(tmp);

    beforeEach(cleanup);
    afterEach(cleanup);
    it('should skip peer dependency installation', async () => {
      await coffee.fork(helper.npminstall, { cwd: tmp })
        .debug()
        .expect('code', 0)
        .expect('stderr', /\[npminstall\] install dependency react@>=\^16.0.0 error: {2}Invalid tag name ">=\^16.0.0": Tags may not have any characters that encodeURIComponent encodes./)
        .expect('stderr', /\[npminstall\] install dependency react-dom@>=\^16.0.0 error: {2}Invalid tag name ">=\^16.0.0": Tags may not have any characters that encodeURIComponent encodes./)

        .end();

      const pkgReact = await helper.readJSON(path.join(tmp, 'node_modules/react/package.json'));
      const pkgReactDom = await helper.readJSON(path.join(tmp, 'node_modules/react-dom/package.json'));
      const pkgReactHovertable = await helper.readJSON(path.join(tmp, 'node_modules/react-hovertable/package.json'));
      assert.strictEqual(pkgReact.name, 'react');
      assert.strictEqual(semver(pkgReact.version).major, 17);
      assert.strictEqual(pkgReactDom.name, 'react-dom');
      assert.strictEqual(semver(pkgReactDom.version).major, 17);
      assert.strictEqual(pkgReactHovertable.name, 'react-hovertable');
      assert.strictEqual(pkgReactHovertable.version, '0.3.0');
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
      assert(!fs.existsSync(path.join(tmp, 'node_modules/react-dom/node_modules/react')));
      assert(fs.existsSync(path.join(tmp, 'node_modules/react-dom')));
      assert(fs.existsSync(path.join(tmp, 'node_modules/react')));
    });
  });
});
