'use strict';

const npm = require('./npm');
const local = require('./local');
const remote = require('./remote');
const git = require('./git');
const path = require('path');

module.exports = async (pkg, options) => {
  if (pkg.type === 'local') {
    return await local(pkg, options);
  }
  if (pkg.type === 'remote') {
    return await remote(pkg, options);
  }
  if (pkg.type === 'git' || pkg.type === 'hosted') {
    return await git(pkg, options);
  }
  if (pkg.type === 'alias') {
    return await npm(pkg.subSpec, Object.assign({}, options, {
      ungzipDir: path.join(options.storeDir, pkg.name),
    }));
  }
  return await npm(pkg, options);
};
