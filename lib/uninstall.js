const path = require('node:path');
const chalk = require('chalk');
const utils = require('./utils');

module.exports = async options => {
  const pkgs = options.pkgs;
  options.console = options.console || console;

  const uninstalled = [];
  for (const pkg of pkgs) {
    const succeed = await uninstall(pkg, options);
    if (succeed) {
      uninstalled.push(pkg);
    }
  }

  return uninstalled;
};

async function uninstall(pkg, options) {
  const pkgRoot = path.join(options.targetDir, 'node_modules', pkg.name);
  const pkgInfo = await utils.readJSON(path.join(pkgRoot, 'package.json'));
  await utils.rimraf(pkgRoot);
  const pkgFile = path.resolve(options.targetDir, 'package.json');
  if (await utils.exists(pkgFile)) {
    await utils.pruneJSON(pkgFile, pkg.name);
  }
  const rootPrefix = options.workspaceRoot || options.root;
  options.console.log('%s %s %s',
    chalk.red('-'),
    chalk.yellow(pkg.name),
    chalk.gray(pkgRoot.replace(rootPrefix, '.')));

  for (const file in pkgInfo.bin) {
    const binPath = path.join(options.binDir, file);
    await utils.rimraf(binPath);
    options.console.log('%s %s %s',
      chalk.red('-'),
      chalk.yellow(pkg.name),
      chalk.gray(binPath.replace(rootPrefix, '.')));
  }
  return true;
}
