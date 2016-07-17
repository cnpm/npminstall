'use strict';

const chalk = require('chalk');
const runScript = require('./utils').runScript;

module.exports = preuninstall;

// @see https://docs.npmjs.com/misc/scripts
function* preuninstall(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.preuninstall) {
    options.console.warn(chalk.yellow('[%s@%s]%s scripts.preuninstall: %j'),
      pkg.name, pkg.version, options.ignoreScripts ? ' ignore' : '', scripts.preuninstall);
    if (!options.ignoreScripts) {
      yield runScript(root, scripts.preuninstall, options);
    }
  }
  if (scripts.uninstall) {
    options.console.warn(chalk.yellow('[%s@%s]%s scripts.uninstall: %j'),
      pkg.name, pkg.version, options.ignoreScripts ? ' ignore' : '', scripts.uninstall);
    if (!options.ignoreScripts) {
      yield runScript(root, scripts.uninstall, options);
    }
  }
}
