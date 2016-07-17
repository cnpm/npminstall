'use strict';

const chalk = require('chalk');
const runScript = require('./utils').runScript;

module.exports = postuninstall;

// @see https://docs.npmjs.com/misc/scripts
function* postuninstall(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.postuninstall) {
    options.console.warn(chalk.yellow('[%s@%s]%s scripts.postuninstall: %j'),
      pkg.name, pkg.version, options.ignoreScripts ? ' ignore' : '', scripts.postuninstall);
    if (!options.ignoreScripts) {
      // root is removed
      yield runScript(options.root, scripts.postuninstall, options);
    }
  }
}
