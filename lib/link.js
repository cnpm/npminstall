'use strict';

const debug = require('debug')('npminstall:link');
const utils = require('./utils');
const path = require('path');

module.exports = async (parentDir, pkg, realDir) => {
  const linkDir = path.join(parentDir, 'node_modules', pkg.name);
  await utils.mkdirp(path.dirname(linkDir));
  const relative = await utils.forceSymlink(realDir, linkDir);
  debug('%s@%s link %s => %s', pkg.name, pkg.version, linkDir, relative);
};
