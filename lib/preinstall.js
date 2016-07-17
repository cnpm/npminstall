'use strict';

const chalk = require('chalk');
const runScript = require('./utils').runScript;

module.exports = preinstall;

// @see https://docs.npmjs.com/misc/scripts
function* preinstall(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.preinstall) {
    options.console.warn(chalk.yellow('[%s@%s]%s scripts.preinstall: %j'),
      pkg.name, pkg.version, options.ignoreScripts ? ' ignore' : '', scripts.preinstall);
    if (!options.ignoreScripts) {
      yield runScript(root, scripts.preinstall, options);
    }
  }
}
