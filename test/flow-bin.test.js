'use strict';

const npminstall = require('./npminstall');
const utils = require('../lib/utils');
const helper = require('./helper');

describe('test/flow-bin.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should install flow-bin from china mirror', async () => {
    if (!process.env.local) return;
    const registry = process.env.local ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.com';
    const binaryMirrors = await utils.getBinaryMirrors(registry);
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'flow-bin' },
      ],
      binaryMirrors,
    });
  });

  it('should install cypress from china mirror', async () => {
    const registry = process.env.local ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.com';
    const binaryMirrors = await utils.getBinaryMirrors(registry);
    await npminstall({
      root: tmp,
      pkgs: [
        { name: 'cypress' },
      ],
      binaryMirrors,
    });
  });
});
