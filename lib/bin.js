const debug = require('node:util').debuglog('npminstall:bin');
const path = require('node:path');
const fs = require('node:fs/promises');
const chalk = require('chalk');
const cmdShim = require('@zkochan/cmd-shim');
const normalize = require('npm-normalize-package-bin');
const fixBin = require('bin-links/lib/fix-bin');
const utils = require('./utils');

module.exports = bin;

async function bin(parentDir, pkg, pkgDir, options, displayName = '') {
  // security fix
  // https://github.com/npm/cli/commit/19ce061a2ee165d8de862c8f0f733c222846b9e1#diff-b05945a9118978f01ad9162683e74404
  normalize(pkg);
  let bins = pkg.bin || {};
  if (typeof bins === 'string') {
    bins = {};
    bins[pkg.name] = pkg.bin;
  }

  const names = Object.keys(bins);
  if (names.length === 0) {
    return;
  }
  displayName = displayName || `${pkg.name}@${pkg.version}`;
  // root package link to options.binDir first
  let binDir;
  let showBinLog = false;
  if (options.binDir && parentDir === options.targetDir) {
    binDir = options.binDir;
    showBinLog = true;
  } else {
    binDir = path.join(parentDir, 'node_modules', '.bin');
  }
  await utils.mkdirp(binDir);

  for (const name of names) {
    const srcBin = path.join(pkgDir, bins[name]);
    const destBin = path.join(binDir, name);
    if (!(await utils.exists(srcBin))) {
      options.pendingMessages.push([
        'warn',
        '%s %s %s',
        chalk.yellow('WARN'),
        chalk.gray(displayName),
        `Failed to create bin at '${destBin}', the source file '${srcBin}' not exist`,
      ]);
      continue;
    }
    // add NODE_PATH on shim bin
    // pkgDir: node_modules/.store/<name>@<version>/node_modules/<name>
    const nodePath = utils.relative(path.join(pkgDir, '..'), destBin);
    await linkBin(srcBin, destBin, `$basedir/${nodePath}`);
    // hotfix $basedir to %~dp0 on cmd
    const destBinCmd = `${destBin}.cmd`;
    if (await utils.exists(destBinCmd)) {
      const content = await fs.readFile(destBinCmd, 'utf-8');
      await fs.writeFile(destBinCmd, content.replace(/\$basedir/g, '%~dp0'));
    }
    // ensure that bin are executable and not containing
    // windows line-endings(CRLF) on the hashbang line
    await fixBin(srcBin, 0o755);
    if (showBinLog) {
      options.console.info('[%s] link %s@ -> %s',
        chalk.green(displayName), chalk.magenta(destBin), srcBin);
    } else {
      debug('[%s@%s] link %s@ -> %s',
        pkg.name, pkg.version, destBin, srcBin);
    }
  }
}

async function linkBin(src, dest, nodePath) {
  await cmdShim.ifExists(src, dest, {
    nodePath,
    createCmdFile: true,
    createPwshFile: true,
  });
}
