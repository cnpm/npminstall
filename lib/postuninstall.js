'use strict';

const chalk = require('chalk');
const runScript = require('./utils').runScript;

module.exports = postuninstall;

// @see https://docs.npmjs.com/misc/scripts
async function postuninstall(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.postuninstall) {
    options.console.warn(chalk.yellow('[npminstall:runscript] [%s@%s]%s scripts.postuninstall: %j, root: %j'),
      pkg.name, pkg.version, options.ignoreScripts ? ' ignore' : '', scripts.postuninstall, options.root);
    if (!options.ignoreScripts) {
      // root is removed
      await runScript(options.root, scripts.postuninstall, options);
    }
  }
}
