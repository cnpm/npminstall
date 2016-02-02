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

const debug = require('debug')('npminstall:preinstall');
const runScript = require('./utils').runScript;

module.exports = preinstall;

// @see https://docs.npmjs.com/misc/scripts
function* preinstall(pkg, root) {
  const scripts = pkg.scripts || {};
  if (scripts.preinstall) {
    debug('[%s@%s] preinstall scripts: %j', pkg.name, pkg.version, scripts.preinstall);
    yield runScript(root, scripts.preinstall);
  }
}
