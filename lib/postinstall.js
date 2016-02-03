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

const path = require('path');
const chalk = require('chalk');
const utils = require('./utils');
const fs = require('mz/fs');

module.exports = postinstall;

// @see https://docs.npmjs.com/misc/scripts
function* postinstall(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.install) {
    options.console.warn(chalk.yellow('[%s@%s] scripts.install: %j'),
      pkg.name, pkg.version, scripts.install);
    yield utils.runScript(root, scripts.install, options);
  } else {
    // https://docs.npmjs.com/misc/scripts#default-values
    // "install": "node-gyp rebuild"
    // If there is a binding.gyp file in the root of your package,
    // npm will default the install command to compile using node-gyp.
    if (yield fs.exists(path.join(root, 'binding.gyp'))) {
      yield utils.runScript(root, 'node-gyp rebuild', options);
    }
  }

  if (scripts.postinstall) {
    options.console.warn(chalk.yellow('[%s@%s] scripts.postinstall: %j'),
      pkg.name, pkg.version, scripts.postinstall);
    yield utils.runScript(root, scripts.postinstall, options);
  }
}
