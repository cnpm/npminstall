/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const chalk = require('chalk');
const runScript = require('./utils').runScript;

module.exports = preinstall;

// @see https://docs.npmjs.com/misc/scripts
function* preinstall(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.preinstall) {
    options.console.warn(chalk.yellow('[%s@%s] scripts.preinstall: %j'),
      pkg.name, pkg.version, scripts.preinstall);
    yield runScript(root, scripts.preinstall, options);
  }
}
