'use strict';

const path = require('node:path');
const assert = require('node:assert');
const dependencies = require('./dependencies');

const NODE_MODULES_DIR = 'node_modules/';

/**
 * The lockfileConverter converts a npm package-lockfile.json to npminstall .dependencies-tree.json.
 * Only lockfileVersion >= 2 is supported.
 * The `.dependencies-tree.json` does not recognize a npm-workspaces package, so we don't need to handle it neither for now.
 * @param {Object} lockfile package-lock.json data
 * @param {Object} options installation options
 * @param {Nested} nested Nested
 */
exports.lockfileConverter = function lockfileConverter(lockfile, options, nested) {
  assert(lockfile.lockfileVersion >= 2, 'Only lockfileVersion >=2 is supported.');

  const tree = {};

  const packages = lockfile.packages;
  for (const pkgPath in packages) {
    /**
     * the lockfile contains all the deps so there's no need to be deps type sensitive.
     */
    const deps = dependencies(packages[pkgPath], options, nested);
    const allMap = deps.allMap;
    for (const key in allMap) {
      const mani = exports.nodeModulesPath(pkgPath, key, packages);
      const dist = {
        checkSSRI: true,
        integrity: mani.integrity,
        tarball: mani.resolved,
      };
      // we need to remove the integrity and resolved field from the mani
      // but the mani should be left intact
      const maniClone = Object.assign({}, mani);
      delete maniClone.integrity;
      delete maniClone.resolved;
      tree[`${key}@${allMap[key]}`] = {
        name: key,
        ...maniClone,
        dist,
        _id: `${key}@${mani.version}`,
      };
    }
  }

  return tree;
};

/**
 * find the matched version of current semver based on nodejs modules resolution algorithm
 * we need check the current directory and ancestors directories to find the matched version of lodash.has
 * e.g.
 *  "": {
 *    "dependencies": {
 *      "lodash.has": "4",
 *      "a": "latest"
 *    },
 *  'node_modules/lodash.has': {
 *    "version": '4.4.0'
 *  },
 *  'node_modules/a': {
 *    'dependencies': {
 *       "lodash.has": "3"
 *    }
 *  },
 *  'node_modules/a/node_modules/lodash.has': {
 *    "version": "3.0.0"
 *  },
 * }
 *
 * the root lodash.has@4 should matches node_modules/lodash.has
 *
 * @param {string} currentPath the current pakcage.json path
 * @param {string} name the dependency name of current package.json
 * @param {Object} packages the lockfile packages
 */
exports.nodeModulesPath = function nodeModulesPath(currentPath, name, packages) {
  const dirs = currentPath.split(NODE_MODULES_DIR);
  dirs.push(name);

  do {
    const dir = path.normalize('.' + dirs.join('/' + NODE_MODULES_DIR));
    const pkg = packages[dir];
    if (pkg) {
      return pkg;
    }

    dirs.splice(dirs.length - 2, 1);
  } while (dirs.length > 1);
};
