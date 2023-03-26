const debug = require('node:util').debuglog('npminstall:link');
const path = require('node:path');
const utils = require('./utils');
const { getAliasPackageName } = require('./alias');

module.exports = async (parentDir, pkg, realDir, alias, options) => {
  // parentDir: node_modules/.store/utility@1.17.0/node_modules/utility
  //   => node_modules/.store/utility@1.17.0/node_modules/{name}
  let targetDir = path.dirname(parentDir);
  let dirname = path.basename(targetDir);
  if (dirname[0] === '@') {
    // scoped package
    // parentDir: node_modules/.store/@babel/preset-react@7.18.6/node_modules/@babel/preset-react
    //   => node_modules/.store/@babel/preset-react@7.18.6/node_modules/{name}
    targetDir = path.dirname(targetDir);
    dirname = path.basename(targetDir);
  }
  const isGlobalInstall = options && options.global;
  if (isGlobalInstall && parentDir === options.root) {
    // don't change parentDir
    // parentDir: ~/.npm-global/lib/node_modules/<name>
    targetDir = parentDir;
    dirname = path.basename(targetDir);
  }

  if (dirname !== 'node_modules') {
    // parentDir: /home/admin/somedir
    //   => /home/admin/somedir/node_modules/{name}
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
