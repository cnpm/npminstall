const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const helper = require('./helper');
const npminstall = require('./npminstall');

describe('test/installTarget.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install to target dir', async () => {
    await npminstall({
      root: tmp,
      targetDir: path.join(tmp, 'targetDir'),
      binDir: path.join(tmp, 'binDir'),
      pkgs: [
        { name: 'koa', version: 'latest' },
        { name: 'mocha', version: 'latest' },
      ],
    });

    let pkg = await helper.readJSON(path.join(tmp, 'targetDir/node_modules/koa/package.json'));
    assert(pkg.name, 'koa');
    pkg = await helper.readJSON(path.join(tmp, 'targetDir/node_modules/mocha/package.json'));
    assert(pkg.name, 'mocha');
    const pkgs = await fs.readdir(path.join(tmp, 'targetDir/node_modules/'));
    assert(pkgs.includes('koa'));
    assert(pkgs.includes('mocha'));
    const bins = await fs.readdir(path.join(tmp, 'binDir'));
    assert(bins.includes('mocha'));
    assert(bins.includes('_mocha'));
  });
});
