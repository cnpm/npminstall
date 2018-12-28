'use strict';

const chalk = require('chalk');
const path = require('path');
const fs = require('mz/fs');
const utils = require('./utils');

module.exports = postinstall;

// @see https://docs.npmjs.com/misc/scripts
// npminstall will collect all install & postinstall scripts,
// and run these scripts until all dependencies installed
// node-gyp rebuild don't dependent on other packages, so we can run it immediately
function* postinstall(pkg, root, optional, displayName, options) {
  const scripts = pkg.scripts || {};

  // https://docs.npmjs.com/misc/scripts#default-values
  // "install": "node-gyp rebuild"
  // If there is a binding.gyp file in the root of your package,
  // npm will default the install command to compile using node-gyp.
  if (!scripts.install && (yield fs.exists(path.join(root, 'binding.gyp')))) {
    options.console.warn(
      '[npminstall:runscript] %s found binding.gyp file, auto run "node-gyp rebuild", root: %j',
      chalk.gray(displayName), root
    );
    const cmd = 'node-gyp rebuild';
    try {
      yield utils.runScript(root, cmd, options);
    } catch (err) {
      options.console.warn('[npminstall:runscript:error] %s has binding.gyp file, run %j error: %s',
        chalk.red(displayName), cmd, err);
      throw err;
    }
  }

  if (scripts.install || scripts.postinstall) {
    if (options.postInstallTasks.some(task => task.root === root)) {
      return;
    }
    options.postInstallTasks.push({
      pkg,
      root,
      optional,
      displayName,
    });
  }
}
