const dependencies = require('../lib/dependencies');
const assert = require('assert');
const Nested = require('../lib/nested');

describe('test/dependencies.test.js', () => {
  const nested = new Nested([]);
  it('should work with dependencies and devDependencies', () => {
    const pkg = {
      dependencies: {
        koa: '1',
        express: '2',
      },
      devDependencies: {
        connect: '3',
        egg: '4',
        koa: '5',
      },
    };

    const parsed = dependencies(pkg, {}, nested);
    assert.deepEqual(parsed.all, [
      { name: 'koa', version: '1', optional: false },
      { name: 'express', version: '2', optional: false },
      { name: 'connect', version: '3', optional: false },
      { name: 'egg', version: '4', optional: false },
    ]);
    assert.deepEqual(parsed.allMap, { koa: '1', express: '2', connect: '3', egg: '4' });
    assert.deepEqual(parsed.prod, [
      { name: 'koa', version: '1', optional: false },
      { name: 'express', version: '2', optional: false },
    ]);
    assert.deepEqual(parsed.prodMap, { koa: '1', express: '2' });
  });

  it('should work with dependencies, devDependencies and optionalDependencies', () => {
    const pkg = {
      dependencies: {
        koa: '1',
        express: '2',
      },
      devDependencies: {
        connect: '3',
        egg: '4',
        koa: '5',
      },
      optionalDependencies: {
        express: '3',
        hapi: '1',
      },
    };

    const parsed = dependencies(pkg, {}, nested);
    assert.deepEqual(parsed.all, [
      { name: 'koa', version: '1', optional: false },
      { name: 'express', version: '3', optional: true },
      { name: 'hapi', version: '1', optional: true },
      { name: 'connect', version: '3', optional: false },
      { name: 'egg', version: '4', optional: false },
    ]);
    assert.deepEqual(parsed.allMap, { koa: '1', express: '3', connect: '3', egg: '4', hapi: '1' });
    assert.deepEqual(parsed.prod, [
      { name: 'koa', version: '1', optional: false },
      { name: 'express', version: '3', optional: true },
      { name: 'hapi', version: '1', optional: true },
    ]);
    assert.deepEqual(parsed.prodMap, { koa: '1', express: '3', hapi: '1' });
  });

  it('should ignore optionalDependencies', () => {
    const pkg = {
      dependencies: {
        koa: '1',
        express: '2',
      },
      devDependencies: {
        connect: '3',
        egg: '4',
        koa: '5',
      },
      optionalDependencies: {
        express: '3',
        hapi: '1',
      },
    };

    const parsed = dependencies(pkg, { ignoreOptionalDependencies: true }, nested);
    assert.deepEqual(parsed.all, [
      { name: 'koa', version: '1', optional: false },
      { name: 'connect', version: '3', optional: false },
      { name: 'egg', version: '4', optional: false },
    ]);
    assert.deepEqual(parsed.allMap, { koa: '1', connect: '3', egg: '4' });
    assert.deepEqual(parsed.prod, [
      { name: 'koa', version: '1', optional: false },
    ]);
    assert.deepEqual(parsed.prodMap, { koa: '1' });
  });

  it('should work with dependencies, devDependencies, clientDependencies, buildDependencies and isomorphicDependencies', () => {
    const pkg = {
      dependencies: {
        koa: '1',
        express: '2',
      },
      devDependencies: {
        mocha: '3',
        eslint: '4',
      },
      clientDependencies: {
        react: '3',
        vue: '1',
      },
      buildDependencies: {
        webpack: '1',
        babel: '2',
      },
      isomorphicDependencies: {
        utility: '1',
        validator: '2',
      },
    };

    const parsed = dependencies(pkg, {}, nested);
    assert.deepEqual(parsed.all, [
      { name: 'koa', version: '1', optional: false },
      { name: 'express', version: '2', optional: false },
      { name: 'react', version: '3', optional: false },
      { name: 'vue', version: '1', optional: false },
      { name: 'webpack', version: '1', optional: false },
      { name: 'babel', version: '2', optional: false },
      { name: 'utility', version: '1', optional: false },
      { name: 'validator', version: '2', optional: false },
      { name: 'mocha', version: '3', optional: false },
      { name: 'eslint', version: '4', optional: false },
    ]);
    assert.deepEqual(parsed.allMap, {
      koa: '1',
      express: '2',
      react: '3',
      vue: '1',
      webpack: '1',
      babel: '2',
      utility: '1',
      validator: '2',
      mocha: '3',
      eslint: '4',
    });
    assert.deepEqual(parsed.prod, [
      { name: 'koa', version: '1', optional: false },
      { name: 'express', version: '2', optional: false },
      { name: 'utility', version: '1', optional: false },
      { name: 'validator', version: '2', optional: false },
    ]);
    assert.deepEqual(parsed.prodMap, { koa: '1', express: '2', utility: '1', validator: '2' });

    assert.deepEqual(parsed.client, [
      { name: 'react', version: '3', optional: false },
      { name: 'vue', version: '1', optional: false },
      { name: 'webpack', version: '1', optional: false },
      { name: 'babel', version: '2', optional: false },
      { name: 'utility', version: '1', optional: false },
      { name: 'validator', version: '2', optional: false },
    ]);
    assert.deepEqual(parsed.clientMap, {
      react: '3',
      vue: '1',
      webpack: '1',
      babel: '2',
      utility: '1',
      validator: '2',
    });
  });

  it('should check dumplicated', () => {
    const pkg = {
      dependencies: {
        koa: '1',
        express: '2',
      },
      clientDependencies: {
        koa: '1',
        react: '3',
        vue: '1',
      },
      buildDependencies: {
        koa: '2',
        webpack: '1',
        babel: '2',
      },
      isomorphicDependencies: {
        vue: '1',
        express: '1',
        utility: '1',
        validator: '2',
      },
    };

    try {
      dependencies(pkg, {}, nested);
      throw new Error('should not excute');
    } catch (err) {
      assert(err.message === `duplicate dependencies error, put isomorphic dependency into isomorphicDependencies:
koa defined multiple times in dependencies,clientDependencies
express defined multiple times in dependencies,isomorphicDependencies
vue defined multiple times in clientDependencies,isomorphicDependencies`);
    }
  });
});
