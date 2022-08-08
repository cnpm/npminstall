'use strict';

const chalk = require('chalk');
const runScript = require('./utils').runScript;

module.exports = prepare;

// @see https://docs.npmjs.com/misc/scripts
// Run BEFORE the package is pack or publish. (Also run on local npm install without any arguments.)
async function prepare(pkg, root, options) {
  const scripts = pkg.scripts || {};
  if (scripts.prepare) {
    options.console.warn(
      '[npminstall:runscript] %s %s %j, root: %j',
      chalk.yellow('scripts.prepare'),
      chalk.gray(`${pkg.name}@${pkg.version}`),
      scripts.prepare,
      root
    );
    await runScript(root, scripts.prepare, options);
  }
}
