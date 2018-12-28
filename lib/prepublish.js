'use strict';

const chalk = require('chalk');
const runScript = require('./utils').runScript;

module.exports = prepublish;

// @see https://docs.npmjs.com/misc/scripts
// Run BEFORE the package is published. (Also run on local npm install without any arguments.)
function* prepublish(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.prepublish) {
    options.console.warn(
      '[npminstall:runscript] %s %s %j, root: %j',
      chalk.yellow('scripts.prepublish'),
      chalk.gray(`${pkg.name}@${pkg.version}`),
      scripts.prepublish,
      root
    );
    yield runScript(root, scripts.prepublish, options);
  }
}
