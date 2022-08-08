'use strict';

const assert = require('assert');
const nock = require('nock');
const path = require('path');
const DepResolver = require('../../lib/rapid-mode/dep');
const Tree = require('./fixtures/rapid-mode-download-local-deps/tree.json');
const config = require('../../lib/config');

describe('test/rapid-node/dep.test.js', () => {
  describe('local cache resolve', () => {
    it('should read load cache', async () => {
      const resolver = new DepResolver({
        cwd: '/dev/null',
        pkg: {},
        depsTreePath: path.join(__dirname, './fixtures/rapid-mode-download-local-deps/tree.json'),
        update: {
          all: false,
          names: [],
        },
      });
      await resolver.resolve();
    });
  });

  describe('local resolve', () => {
    const cwd = path.join(__dirname, './fixtures/local_resolver');

    it('should generate true', async () => {
      const resolver = new DepResolver({
        root: cwd,
        registry: config.registry,
        pkg: require(path.join(cwd, 'package.json')),
        depsTreePath: null,
        update: {
          all: false,
          names: [],
        },
      });
      const lock = await resolver.resolve();
      assert(lock);
      assert(lock.packages['node_modules/lodash.get']);
      assert(lock.packages['node_modules/lodash.set']);
    });
  });
});
