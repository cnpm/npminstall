const coffee = require('coffee');
const helper = require('./helper');

describe('test/npa-error.test.js', () => {
  const [ tmp, cleanup ] = helper.tmp();

  beforeEach(cleanup);
  afterEach(cleanup);
  it('should throw error when package name is invalid', async () => {
    await coffee.fork(helper.npminstall, [
      `--prefix=${tmp}`,
      '-g',
      'lodash-has @^4',
    ])
      .debug()
      .expect('stderr', /Error: Invalid package name "lodash-has ": name cannot contain leading or trailing spaces; name can only contain URL-friendly characters package: root › lodash-has @\^4/)
      .expect('code', 1)
      .end();
  });


  it('should throw error when package name is invalid, and print deps in global installation', async () => {
    await coffee.fork(helper.npminstall, [
      'create-table-picker@0.1.2',
      '-g',
    ])
      .debug()
      .expect('stderr', /Error: Invalid tag name ">=\^16.0.0": Tags may not have any characters that encodeURIComponent encodes. package: root › create-table-picker@0.1.2 › react-hovertable@\^0.3.0 › react@>=\^16.0.0/)
      .expect('code', 1)
      .end();
  });

  it('shold show package when version is invalid', async () => {
    const root = helper.fixtures('npa-semver-error');
    await coffee.fork(helper.npminstall, [], {
      cwd: root,
      pkgs: [],
    })
      .debug()
      .expect('stderr', /Error: Invalid tag name ">=\^16.0.0": Tags may not have any characters that encodeURIComponent encodes. package: root › create-table-picker@0.1.2 › react-hovertable@\^0.3.0 › react@>=\^16.0.0/)
      .expect('code', 1)
      .end();
  });

  it('shold show package when name is invalid', async () => {
    const root = helper.fixtures('npa-name-error');
    await coffee.fork(helper.npminstall, [], {
      cwd: root,
      pkgs: [],
    })
      .debug()
      .expect('stderr', /Error: Invalid package name "lodash.has ": name cannot contain leading or trailing spaces; name can only contain URL-friendly characters package: root › lodash.has @\^4/)
      .expect('code', 1)
      .end();
  });
});
