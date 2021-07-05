'use strict';

const npm = require('./npm');
const local = require('./local');
const remote = require('./remote');
const git = require('./git');
const { LOCAL_TYPES } = require('../npa_types');

module.exports = async (pkg, options) => {
  if (LOCAL_TYPES.includes(pkg.type)) {
    return await local(pkg, options);
  }
  if (pkg.type === 'remote') {
    return await remote(pkg, options);
  }
  if (pkg.type === 'git') {
    return await git(pkg, options);
  }

  // type is `tag | version | range | alias`
  return await npm(pkg, options);
};
