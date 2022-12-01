const debug = require('debug')('npminstall:link');
const utils = require('./utils');
const path = require('path');
const {
  getAliasPackageName,
} = require('./alias');

module.exports = async (parentDir, pkg, realDir, alias) => {
  // parentDir: node_modules/.store/utility@1.17.0/node_modules/utility
  // => node_modules/.store/utility@1.17.0/node_modules/{name}
  let targetDir = path.dirname(parentDir);
  if (path.basename(targetDir) !== 'node_modules') {
    // parentDir: /home/admin/somedir
    // => node_modules/{name}
    targetDir = path.join(parentDir, 'node_modules');
  }
  let linkDir = path.join(targetDir, pkg.name);
  const {
    version,
    name,
  } = pkg;
  const displayName = getAliasPackageName(alias, name, version);

  if (alias) {
    linkDir = path.join(targetDir, alias);
  }

  await utils.mkdirp(path.dirname(linkDir));
  const relative = await utils.forceSymlink(realDir, linkDir);
  debug('%s link %s => %s, parentDir: %s', displayName, linkDir, relative, parentDir);
};
