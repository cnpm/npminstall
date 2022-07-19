'use strict';

const minimatch = require('minimatch');
const utils = require('./utils');
const chalk = require('chalk');
const { parsePackageName } = require('./alias');
const npa = require('./npa');

// https://github.com/yarnpkg/rfcs/blob/master/implemented/0000-selective-versions-resolutions.md#package-designation
// https://github.com/yarnpkg/yarn/blob/3119382885/src/util/parse-package-path.js#L10
const WRONG_PATTERNS = /\/$|\/{2,}|\*+$/;

// createResolution
module.exports = (pkg, options) => {
  const resolutions = pkg && pkg.resolutions || {};
  const resolutionMap = new Map();

  // parse resolutions, generate resolutionMap:
  // {
  //   debug: [
  //     "koa/accept", "1.0.0",
  //     "send": "2.0.0"
  //   ],
  //   less: [
  //     "**", "^1"
  //   ],
  //   vary: [
  //     "@koa/cors", "1.0.0"
  //   ]
  // }
  for (const path in resolutions) {
    const sections = path.split('/');
    let scope = '';
    const packages = [];
    // 1. check package name
    if (WRONG_PATTERNS.test(path)) {
      throw new Error(`[resolutions] resolution package ${path} format error`);
    }
    // 2. process package with scope like `@koa/cors`
    for (let section of sections) {
      if (section.startsWith('@') && !scope) {
        scope = section;
        continue;
      }
      if (scope) {
        section = `${scope}/${section}`;
        scope = '';
      }
      packages.push(section);
    }
    // debug => **/debug
    if (packages.length === 1) packages.unshift('**');
    const endpoint = packages.pop();
    const version = resolutions[path];

    if (!resolutionMap.has(endpoint)) resolutionMap.set(endpoint, []);
    resolutionMap.get(endpoint).push([ packages.join('/'), version ]);
  }

  return (pkg, ancestors, nested) => {
    // only work for nested dependencies
    if (!ancestors.length) return pkg;
    // check pkg.name first to reduce calculate
    const resolutions = resolutionMap.get(pkg.name);
    if (!resolutions) return pkg;

    const ancestorPath = ancestors.map(ancestor => ancestor.name).join('/');
    for (const resolution of resolutions) {
      const path = resolution[0];
      const version = resolution[1];
      if (minimatch(ancestorPath, path)) {
        options.pendingMessages.push([
          'warn',
          '%s %s override by %s',
          chalk.yellow('resolutions'),
          chalk.gray(utils.getDisplayName(pkg, ancestors)),
          chalk.magenta(`${path}/${pkg.name}@${version}`),
        ]);
        // alias(npm:lodash@^1) support
        const [ aliasPackageName, realPackageName ] = parsePackageName(`${pkg.name}@${version}`, nested);

        if (aliasPackageName) {
          const {
            name,
            fetchSpec,
          } = npa(realPackageName, { nested });

          return Object.assign({}, pkg, {
            alias: aliasPackageName,
            version: fetchSpec,
            name,
          });
        }

        return Object.assign({}, pkg, { version });
      }
    }

    return pkg;
  };
};
