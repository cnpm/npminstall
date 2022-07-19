'use strict';

const debug = require('debug')('npminstall:link');
const utils = require('./utils');
const path = require('path');
const {
  getAliasPackageName,
} = require('./alias');

module.exports = async (parentDir, pkg, realDir, alias) => {
  let linkDir = path.join(parentDir, 'node_modules', pkg.name);
  const {
    version,
    name,
  } = pkg;
  const displayName = getAliasPackageName(alias, name, version);

  if (alias) {
    linkDir = path.join(parentDir, 'node_modules', alias);
  }

  await utils.mkdirp(path.dirname(linkDir));
  const relative = await utils.forceSymlink(realDir, linkDir);
  debug('%s link %s => %s', displayName, linkDir, relative);
};
