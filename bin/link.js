#!/usr/bin/env node

'use strict';

const co = require('co');
const assert = require('assert');
const chalk = require('chalk');
const path = require('path');
const fs = require('mz/fs');
const parseArgs = require('minimist');
const utils = require('../lib/utils');
const bin = require('../lib/bin');

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
  console.log(
`
Usage:

  npmlink <folder>

Can specify one or more: npmlink /some/folder1 /some/folder2
`
  );
  process.exit(0);
}

const folders = [];
const root = argv.root || process.cwd();

for (const name of argv._) {
  let folder = utils.formatPath(name);
  if (!path.isAbsolute(folder)) {
    folder = path.join(root, folder);
  }
  assert(fs.existsSync(folder), `${folder} not exists`);
  folders.push(folder);
}

co(function* npmlink() {
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
    // link current dir to global
    const meta = utils.getGlobalInstallMeta(argv.prefix);
    // 1. npminstall
    // 2. link CWD to targetDir/node_modules/{name}
    // 3. link bins to binDir
    const pkgFile = path.join(root, 'package.json');
    const pkg = yield utils.readJSON(pkgFile);
    assert(pkg.name, `package.name not eixsts on ${pkgFile}`);
    const linkDir = path.join(meta.targetDir, 'node_modules', pkg.name);

    console.info(chalk.gray(`\`$ npminstall ${installArgs.join(' ')}\` on ${root}`));
    const installBin = path.join(__dirname, 'install.js');
    yield utils.fork(installBin, installArgs, {
      cwd: root,
    });
    yield utils.forceSymlink(root, linkDir);
    console.info(`link ${chalk.magenta(linkDir)}@ -> ${root}`);
    yield bin(root, pkg, linkDir, {
      console,
      binDir: meta.binDir,
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
  for (const folder of folders) {
    // 1. cd folder && npminstall
    // 2. link folder to CWD/node_modules/{name}
    // 3. link bins
    const pkgFile = path.join(folder, 'package.json');
    const pkg = yield utils.readJSON(pkgFile);
    assert(pkg.name, `package.name not eixsts on ${pkgFile}`);
    const linkDir = path.join(targetDir, pkg.name);

    console.info(chalk.gray(`\`$ npminstall ${installArgs.join(' ')}\` on ${folder}`));
    const installBin = path.join(__dirname, 'install.js');
    yield utils.fork(installBin, installArgs, {
      cwd: folder,
      env,
    });
    yield utils.forceSymlink(folder, linkDir);
    console.info(`link ${chalk.magenta(linkDir)}@ -> ${folder}`);
    yield bin(root, pkg, linkDir, { console });
  }
}).catch(err => {
  console.error(chalk.red(err.stack));
  console.error(chalk.yellow('npmlink version: %s'), require('../package.json').version);
  console.error(chalk.yellow('npmlink args: %s'), process.argv.join(' '));
  process.exit(1);
});
