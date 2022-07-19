'use strict';
const nydusdApi = require('../../../lib/rapid-mode/nydusd/nydusd_api');
const constants = require('../../../lib/rapid-mode/constants');
const urllib = require('urllib');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const nydusdBin = path.join(__dirname, `../../../../binding-${process.platform}-${process.arch}/nydusd`);

describe('test/rapid-mode/nydusd/nydusd_api.test.js', () => {
  const cwd = process.cwd();
  if (process.env.CI) {
    return;
  }
  const bootstrapFile = path.join(__dirname, '../fixtures/mock_tar_buckets/nydusd-bootstrap');
  const bootstrapFile2 = path.join(__dirname, '../fixtures/mock_tar_buckets/bootstrap');
  before(async () => {
    await nydusdApi.initDaemon(nydusdBin);
  });

  after(async () => {
    await nydusdApi.exitDaemon();
  });

  it('should start nydusd daemon success', async () => {
    const result = await urllib.request('http://unix/api/v1/daemon', {
      method: 'GET',
      socketPath: constants.socketPath,
    });

    assert.strictEqual(result.status, 200);
  });

  it('should mount success', async () => {
    await nydusdApi.mount('/', cwd, bootstrapFile);
    assert(fs.existsSync(path.join(constants.nydusdMnt, 'lodash.has')));
    await nydusdApi.umount('/');
  });

  it('shoud remount success', async () => {
    await nydusdApi.mount('/', cwd, bootstrapFile);
    assert(fs.existsSync(path.join(constants.nydusdMnt, 'lodash.has')));
    await nydusdApi.remount('/', cwd, bootstrapFile2);
    assert(fs.existsSync(path.join(constants.nydusdMnt, 'lodash.get')));
    await nydusdApi.umount('/');
  });

  it.skip('should umount success', async () => {
    await nydusdApi.mount('/a', cwd, bootstrapFile);
    assert(fs.existsSync(path.join(constants.nydusdMnt, 'a/lodash.has')));
    await nydusdApi.umount('/a');
    assert.strictEqual(fs.existsSync(path.join(constants.nydusdMnt, 'a/lodash.has')), false);
  });
});
