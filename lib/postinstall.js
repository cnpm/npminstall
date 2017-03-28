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
    options.console.info(
      '%s found binding.gyp file, auto run "node-gyp rebuild"',
      chalk.gray(displayName)
    );
    yield utils.runScript(root, 'node-gyp rebuild', options);
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
