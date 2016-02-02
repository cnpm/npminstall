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

const debug = require('debug')('npminstall:postinstall');
const path = require('path');
const utils = require('./utils');

module.exports = postinstall;

// @see https://docs.npmjs.com/misc/scripts
function* postinstall(pkg, root) {
  const scripts = pkg.scripts || {};
  if (scripts.install) {
    debug('[%s@%s] install scripts: %j', pkg.name, pkg.version, scripts.install);
    yield utils.runScript(root, scripts.install);
  } else {
    // https://docs.npmjs.com/misc/scripts#default-values
    // "install": "node-gyp rebuild"
    // If there is a binding.gyp file in the root of your package,
    // npm will default the install command to compile using node-gyp.
    if (yield utils.exists(path.join(root, 'binding.gyp'))) {
      yield utils.runScript(root, 'node-gyp rebuild');
    }
  }

  if (scripts.postinstall) {
    debug('[%s@%s] postinstall scripts: %j', pkg.name, pkg.version, scripts.postinstall);
    yield utils.runScript(root, scripts.postinstall);
  }
}
