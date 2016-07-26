'use strict';

/**
 * impl npm install -g pkg1[, pkg2, ...]
 */

const path = require('path');
const utility = require('utility');
const installLocal = require('./local_install');
const utils = require('./utils');

module.exports = function* (options) {
  const pkgs = options.pkgs || [];
  const opts = Object.assign({}, options);
  for (const pkg of pkgs) {
    let name = pkg.name;
    if (!name) {
      name = utility.md5(pkg.version);
    }
    // add `node_modules` in the last to ensure `module.paths` contains storeDir
    const storeDir = path.join(opts.targetDir, 'node_modules', `.${name}_npminstall/node_modules`);
    yield utils.rimraf(storeDir);
    const pkgOptions = Object.assign({}, opts, {
      storeDir,
    });
    pkgOptions.pkgs = [ pkg ];
    yield installLocal(pkgOptions);
  }
};
