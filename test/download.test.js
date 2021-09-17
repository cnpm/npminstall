'use strict';

const assert = require('assert');
const mm = require('mm');
const path = require('path');
const urllib = require('urllib');
const install = require('./npminstall');
const helper = require('./helper');
const coffee = require('coffee');

describe('test/download.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);
  afterEach(mm.restore);

  describe('mock tarball not exists', () => {
    it('should throw error when status === 404', async () => {
      const request = urllib.request;
      mm(urllib, 'request', async (url, options) => {
        // if (url.endsWith('.tgz')) {
        //   mm.restore();
        // }
        const result = await request.call(urllib, url, options);
        if (url.endsWith('.tgz')) {
          result.status = 404;
        }
        return result;
      });

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
      const request = urllib.request;
      mm(urllib, 'request', async (url, options) => {
        // if (url.endsWith('.tgz')) {
        //   mm.restore();
        // }
        const result = await request.call(urllib, url, options);
        if (url.endsWith('.tgz')) {
          result.status = 206;
        }
        return result;
      });

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
      const registry = process.env.npm_registry || 'https://r.npm.taobao.org';
      const res = await urllib.request(`${registry}/pedding`, { dataType: 'json', timeout: 10000 });
      const pkg = res.data;
      pkg.versions['1.0.0'].dist.shasum = '00098d60307b4ef7240c3d693cb20a9473c111';
      mm.https.request(/^\/pedding$/, JSON.stringify(pkg));
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
        assert(/real sha1:7f5098d60307b4ef7240c3d693cb20a9473c6074 not equal to remote:00098d60307b4ef7240c3d693cb20a9473c111/.test(err.message));
      }
    });

    it('should throw 500 error', async () => {
      mm.http.request(/\.tgz/, 'hello', { statusCode: 500 });
      mm.https.request(/\.tgz/, 'hello', { statusCode: 500 });
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
      mm.http.request(/\.tgz/, 'hello', { statusCode: 502 });
      mm.https.request(/\.tgz/, 'hello', { statusCode: 502 });

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
      return coffee.fork(helper.npminstall, [
        '@napi-rs/canvas-darwin-x64',
      ], {
        cwd: tmp,
      })
        .debug()
        .beforeScript(path.join(__dirname, './download.mockScript.js'))
        .expect('stderr', /skip download for reason darwin dont includes your platform/)
        .expect('code', 0)
        .end();
    });
  });
});
