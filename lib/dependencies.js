/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */

module.exports = function(pkg) {
  const all = {};
  const prod = {};
  const optionalDependnecies = pkg.optionalDependnecies || {};
  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};

  for (const name in dependencies) {
    all[name] = dependencies[name];
    prod[name] = dependencies[name];
  }
  // follow npm, optionalDependnecies will rewrite dependencies
  for (const name in optionalDependnecies) {
    all[name] = optionalDependnecies[name];
    prod[name] = optionalDependnecies[name];
  }
  for (const name in devDependencies) {
    if (!all.hasOwnProperty(name)) {
      all[name] = devDependencies[name];
    }
  }

  return {
    get all() {
      const results = [];
      for (const name in all) {
        results.push({
          name: name,
          version: all[name],
          optional: optionalDependnecies.hasOwnProperty(name),
        });
      }
      return results;
    },

    get prod() {
      const results = [];
      for (const name in prod) {
        results.push({
          name: name,
          version: all[name],
          optional: optionalDependnecies.hasOwnProperty(name),
        });
      }
      return results;
    },
  };
};
