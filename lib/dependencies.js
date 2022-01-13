'use strict';

const npa = require('./npa');
const {
  parsePackageName,
} = require('./alias');

module.exports = function dependencies(pkg, options, nested) {
  const all = {};
  const prod = {};
  const client = {};
  const optionalDependencies = pkg.optionalDependencies || {};
  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};
  const clientDependencies = pkg.clientDependencies || {};
  const buildDependencies = pkg.buildDependencies || {};
  const isomorphicDependencies = pkg.isomorphicDependencies || {};

  checkDumplicate(pkg);

  for (const name in dependencies) {
    all[name] = dependencies[name];
    prod[name] = dependencies[name];
  }
  for (const name in clientDependencies) {
    all[name] = clientDependencies[name];
    client[name] = clientDependencies[name];
  }
  for (const name in buildDependencies) {
    all[name] = buildDependencies[name];
    client[name] = buildDependencies[name];
  }
  for (const name in isomorphicDependencies) {
    all[name] = isomorphicDependencies[name];
    prod[name] = isomorphicDependencies[name];
    client[name] = isomorphicDependencies[name];
  }
  // follow npm, optionalDependencies will rewrite dependencies
  for (const name in optionalDependencies) {
    if (options.ignoreOptionalDependencies) {
      delete all[name];
      delete prod[name];
    } else {
      all[name] = optionalDependencies[name];
      prod[name] = optionalDependencies[name];
    }
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
      return mergeOptional(all, optionalDependencies, nested);
    },

    get prodMap() {
      return prod;
    },

    get prod() {
      return mergeOptional(prod, optionalDependencies, nested);
    },

    get clientMap() {
      return client;
    },

    get client() {
      return mergeOptional(client, optionalDependencies, nested);
    },
  };
};

function mergeOptional(deps, optional, nested) {
  const results = [];

  for (const name in deps) {
    const version = deps[name];
    const pkg = {
      name,
      version,
      optional: optional.hasOwnProperty(name),
    };

    const raw = `${name}@${version}`;
    nested.update([ raw ]);

    const [
      aliasPackageName,
      realPackageName,
    ] = parsePackageName(raw, nested);

    if (aliasPackageName) {
      const {
        name,
        fetchSpec,
      } = npa(realPackageName, { nested });
      pkg.alias = aliasPackageName;
      pkg.name = name;
      pkg.version = fetchSpec;
    }

    results.push(pkg);
  }
  return results;
}

function checkDumplicate(pkg) {
  const all = new Map();

  function push(scope) {
    const dependencies = pkg[scope] || {};
    for (const name in dependencies) {
      if (!all.has(name)) all.set(name, []);
      all.get(name).push(scope);
    }
  }

  push('dependencies');
  push('clientDependencies');
  push('isomorphicDependencies');

  const duplicates = [];
  for (const dep of all) {
    if (dep[1].length > 1) duplicates.push(dep);
  }

  if (duplicates.length) {
    const detail = duplicates.map(dep => `${dep[0]} defined multiple times in ${dep[1].join(',')}`).join('\n');
    throw new Error(`duplicate dependencies error, put isomorphic dependency into isomorphicDependencies:\n${detail}`);
  }
}
