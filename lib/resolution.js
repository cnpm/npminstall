'use strict';

const minimatch = require('minimatch');
const npa = require('npm-package-arg');
const utils = require('./utils');
const chalk = require('chalk');

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
      if (section !== '**' && !npa(section).name) {
        throw new Error(`[resolutions] resolution package ${path} format error`);
      }
      packages.push(section);
    }
    // debug => **/debug
    if (packages.length === 1) packages.unshift('**');
    const endpoint = packages.pop();
    if (endpoint === '**') throw new Error(`[resolutions] resolution package ${path} format error`);

    const version = resolutions[path];

    if (!resolutionMap.has(endpoint)) resolutionMap.set(endpoint, []);
    resolutionMap.get(endpoint).push([ packages.join('/'), version ]);
  }

  return (pkg, ancestors) => {
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
        return Object.assign({}, pkg, { version });
      }
    }

    return pkg;
  };
};
