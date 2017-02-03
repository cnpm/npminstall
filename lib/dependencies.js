'use strict';

module.exports = function dependencies(pkg) {
  const all = {};
  const prod = {};
  const optionalDependencies = pkg.optionalDependencies || {};
  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};

  for (const name in dependencies) {
    all[name] = dependencies[name];
    prod[name] = dependencies[name];
  }
  // follow npm, optionalDependencies will rewrite dependencies
  for (const name in optionalDependencies) {
    all[name] = optionalDependencies[name];
    prod[name] = optionalDependencies[name];
  }
  for (const name in devDependencies) {
    if (!all.hasOwnProperty(name)) {
      all[name] = devDependencies[name];
    }
  }

  return {
    get allMap() {
      return all;
    },

    get all() {
      const results = [];
      for (const name in all) {
        results.push({
          name,
          version: all[name],
          optional: optionalDependencies.hasOwnProperty(name),
        });
      }
      return results;
    },

    get prodMap() {
      return prod;
    },

    get prod() {
      const results = [];
      for (const name in prod) {
        results.push({
          name,
          version: prod[name],
          optional: optionalDependencies.hasOwnProperty(name),
        });
      }
      return results;
    },
  };
};
