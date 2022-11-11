const assert = require('assert');
const mm = require('mm');
const path = require('path');
const coffee = require('coffee');
const urllib = require('urllib');
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('urllib');
const install = require('./npminstall');
const helper = require('./helper');

describe('test/download.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();
  const globalAgent = getGlobalDispatcher();
  beforeEach(async () => {
    mm(process.env, 'MOCK_AGENT', 'true');
    await cleanup();
  });
  afterEach(async () => {
    await cleanup();
    setGlobalDispatcher(globalAgent);
    mm.restore();
  });

  describe('mock tarball not exists', () => {
    it('should throw error when status === 404', async () => {
      const mockAgent = new MockAgent();
      setGlobalDispatcher(mockAgent);
      const mockPool = mockAgent.get(/registry\./);
      // will auto retry 3 times
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(404, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(404, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(404, Buffer.alloc(10));

      try {
        await install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/response 404 status/.test(err.message), err.message);
      }
    });

    it('should throw error when status === 206', async () => {
      const mockAgent = new MockAgent();
      setGlobalDispatcher(mockAgent);
      const mockPool = mockAgent.get(/registry\./);
      // will auto retry 3 times
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(206, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(206, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(206, Buffer.alloc(10));

      try {
        await install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          cacheDir: '',
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/status: 206 error, should be 200/.test(err.message), err.message);
      }
    });
  });

  describe('mock tarball error', () => {
    it('should throw sha1 error', async () => {
      this.timeout = 15000;
      const registry = process.env.npm_registry || 'https://registry.npmmirror.com';
      const res = await urllib.request(`${registry}/pedding`, { dataType: 'json', timeout: 10000 });
      const pkg = res.data;
      pkg.versions['1.0.0'].dist.shasum = '00098d60307b4ef7240c3d693cb20a9473c111';

      const mockAgent = new MockAgent();
      setGlobalDispatcher(mockAgent);
      const mockPool = mockAgent.get(/^https:\/\/registry\./);
      // will auto retry 3 times
      mockPool.intercept({
        path: /^\/pedding$/,
        method: 'GET',
      }).reply(200, pkg);
      mockPool.intercept({
        path: /^\/pedding$/,
        method: 'GET',
      }).reply(200, pkg);
      mockPool.intercept({
        path: /^\/pedding$/,
        method: 'GET',
      }).reply(200, pkg);

      try {
        await install({
          root: tmp,
          pkgs: [
            { name: 'pedding', version: '1.0.0' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(err.name === 'ShasumNotMatchError');
        assert(/real sha1:7f5098d60307b4ef7240c3d693cb20a9473c6074 not equal to remote:00098d60307b4ef7240c3d693cb20a9473c111, download url https:\/\/registry.npmmirror.com\/pedding\/-\/pedding-1.0.0.tgz, download size 2107 \(pedding@1.0.0\)/
          .test(err.message));
      }
    });

    it('should throw 500 error', async () => {
      const mockAgent = new MockAgent();
      setGlobalDispatcher(mockAgent);
      const mockPool = mockAgent.get(/registry\./);
      // will auto retry 3 times
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(500, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(500, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(500, Buffer.alloc(10));
      try {
        await install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/response 500 status/.test(err.message), err.message);
      }
    });

    it('should throw 502 error', async () => {
      const mockAgent = new MockAgent();
      setGlobalDispatcher(mockAgent);
      const mockPool = mockAgent.get(/registry\./);
      // will auto retry 3 times
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(502, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(502, Buffer.alloc(10));
      mockPool.intercept({
        path: /\.tgz$/,
        method: 'GET',
      }).reply(502, Buffer.alloc(10));

      try {
        await install({
          root: tmp,
          pkgs: [
            { name: 'pedding' },
          ],
          production: true,
        });
        throw new Error('should not run this');
      } catch (err) {
        assert(/response 502 status/.test(err.message), err.message);
      }
    });
  });

  describe('mock platform not matched', () => {
    it('should skip download', async () => {
      await coffee.fork(helper.npminstall, [
        '@napi-rs/canvas-darwin-x64',
      ], {
        cwd: tmp,
      })
        .debug()
        .beforeScript(path.join(__dirname, 'download.mockScript.js'))
        .expect('stderr', /skip download for reason darwin dont includes your platform/)
        .expect('code', 1)
        .end();
    });
  });

  describe('mock arch not matched', () => {
    it('should skip download', async () => {
      await coffee.fork(helper.npminstall, [
        '@napi-rs/canvas-darwin-x64',
      ], {
        cwd: tmp,
      })
        .debug()
        .beforeScript(path.join(__dirname, 'download.mockArchScript.js'))
        .expect('stderr', /skip download for reason x64 dont includes your arch/)
        .expect('code', 1)
        .end();
    });
  });
});
