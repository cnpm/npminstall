#!/usr/bin/env node

'use strict';

const debug = require('debug')('npminstall:bin:link');
const npa = require('npm-package-arg');
const semver = require('semver');
const assert = require('assert');
const chalk = require('chalk');
const path = require('path');
const fs = require('mz/fs');
const parseArgs = require('minimist');
const utils = require('../lib/utils');
const bin = require('../lib/bin');
const { REGISTRY_TYPES } = require('../lib/npa_types');

const orignalArgv = process.argv.slice(2);
const argv = parseArgs(orignalArgv, {
  string: [
    'root',
  ],
  boolean: [
    'version',
    'help',
  ],
});

if (argv.version) {
  console.log('v%s', require('../package.json').version);
  process.exit(0);
}

if (argv.help) {
  console.log(`
Usage:

  npmlink <folder>

Can specify one or more: npmlink /some/folder1 /some/folder2
`
  );
  process.exit(0);
}

const root = argv.root || process.cwd();

const globalMeta = utils.getGlobalInstallMeta(argv.prefix);
const globalModuleDir = path.join(globalMeta.targetDir, 'node_modules');

const folders = argv._.map(name => utils.formatPath(name));

(async () => {
  const installArgs = [];
  for (const arg of orignalArgv) {
    if (arg.startsWith('--root')) {
      continue;
    }
    if (arg[0] !== '-') {
      continue;
    }
    installArgs.push(arg);
  }

  if (folders.length === 0) {
    // 1. npminstall
    // 2. link CWD to targetDir/node_modules/{name}
    // 3. link bins to binDir
    const pkgFile = path.join(root, 'package.json');
    const pkg = await utils.readJSON(pkgFile);
    assert(pkg.name, `package.name not eixsts on ${pkgFile}`);
    const linkDir = path.join(globalMeta.targetDir, 'node_modules', pkg.name);

    console.info(chalk.gray(`\`$ npminstall ${installArgs.join(' ')}\` on ${root}`));
    const installBin = path.join(__dirname, 'install.js');
    await utils.fork(installBin, installArgs, {
      cwd: root,
    });
    await utils.forceSymlink(root, linkDir);
    console.info(`link ${chalk.magenta(linkDir)}@ -> ${root}`);
    await bin(root, pkg, linkDir, {
      console,
      binDir: globalMeta.binDir,
      targetDir: root,
    });
    return;
  }

  // link folders to current dir
  const targetDir = path.join(root, 'node_modules');
  const env = Object.assign({
    // should keep npm_rootpath be current dir
    npm_rootpath: root,
  }, process.env);
  const installBin = path.join(__dirname, 'install.js');

  for (let folder of folders) {
    // 1.
    // if folder is package(not relative path), try
    //   1) if ${globalModuleDir}/package exists and match required spec
    //   2) otherwise install package from npm to ${globalModuleDir}
    // else cd folder && npminstall
    //
    // 2. link folder to CWD/node_modules/{name}
    // 3. link bins

    let pkg;
    debug('link %s', folder);
    // try to parse it as a package, if it is a path(./module/path), pkgInfo.name will be null
    const pkgInfo = npa(folder, root);
    if (pkgInfo.name) {
      debug('link source %s is a npm module', folder);
      folder = path.join(globalModuleDir, pkgInfo.name);
      pkg = await utils.readJSON(path.join(globalModuleDir, pkgInfo.name, 'package.json'));

      // when these situations need install
      // 1. pkg not exist in global module directory
      // 2. pkgInfo with tag, hosted, git spec
      // 3. pkgInfo with version and range spec, and pkg.version not satisfies with spec

      const pkgNotExist = !pkg.name;
      const specIsTag = pkgInfo.type === 'tag' && !!pkgInfo.rawSpec;
      const specNotSemver = !REGISTRY_TYPES.includes(pkgInfo.type);
      const specNotSatisfies = (pkgInfo.type === 'range' || pkgInfo.type === 'version') && !semver.satisfies(pkg.version, pkgInfo.spec);

      if (pkgNotExist || specIsTag || specNotSemver || specNotSatisfies) {
        debug('%s not satisfies with requirement, try to install %s from npm', folder, pkgInfo.raw);
        // try install from npm registry
        console.info(chalk.gray(`\`$ npminstall --global ${pkgInfo.raw}`));
        await utils.fork(installBin, installArgs.concat([ '-g', pkgInfo.raw ]), {
          env,
        });
      }

      const pkgFile = path.join(folder, 'package.json');
      pkg = await utils.readJSON(pkgFile);
      assert(pkg.name, `package.name not eixsts on ${pkgFile}`);
    } else {
      if (!path.isAbsolute(folder)) {
        folder = path.join(root, folder);
      }
      // read from folder
      if (!(await fs.exists(folder))) {
        throw new Error(`${folder} not exists`);
      }

      const pkgFile = path.join(folder, 'package.json');
      pkg = await utils.readJSON(pkgFile);
      assert(pkg.name, `package.name not eixsts on ${pkgFile}`);

      // install dependencies
      console.info(chalk.gray(`\`$ npminstall ${installArgs.join(' ')}\` on ${folder}`));
      await utils.fork(installBin, installArgs, {
        cwd: folder,
        env,
      });
    }

    // link folder to CWD/node_modules/{name}
    const linkDir = path.join(targetDir, pkg.name);
    await utils.forceSymlink(folder, linkDir);
    // link bins
    console.info(`link ${chalk.magenta(linkDir)}@ -> ${folder}`);
    await bin(root, pkg, linkDir, { console });
  }
})().catch(err => {
  console.error(chalk.red(err.stack));
  console.error(chalk.yellow('npmlink version: %s'), require('../package.json').version);
  console.error(chalk.yellow('npmlink args: %s'), process.argv.join(' '));
  process.exit(1);
});
