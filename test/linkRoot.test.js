const assert = require('node:assert');
const path = require('node:path');
const npminstall = require('./npminstall');
const helper = require('./helper');

describe('test/linkRoot.test.js', () => {
  const [ root, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should display error when post install', async () => {
    await npminstall({
      root,
      pkgs: [
        { name: 'es3ify', version: '0.1.2' },
        { name: 'es3ify-loader', version: '0.1.0' },
      ],
    });
    let pkg = await helper.readJSON(path.join(root, 'node_modules/es3ify/package.json'));
    assert.equal(pkg.version, '0.1.2');
    pkg = await helper.readJSON(path.join(root, 'node_modules/es3ify-loader/package.json'));
    assert.equal(pkg.version, '0.1.0');
  });
});
