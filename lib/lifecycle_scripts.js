const chalk = require('chalk');
const path = require('path');
const os = require('os');
const npa = require('npm-package-arg');
const ms = require('ms');
const { LOCAL_TYPES } = require('./npa_types');
const utils = require('./utils');

// scripts that should run in root package and linked package
exports.DEFAULT_ROOT_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
];

// scripts that should run in dependencies
exports.DEFAULT_DEP_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
];

exports.runLifecycleScripts = async function runLifecycleScripts(pkg, root, originPkg, displayName, options) {
  const scripts = pkg.scripts || {};

  // https://docs.npmjs.com/misc/scripts#default-values
  // "install": "node-gyp rebuild"
  // If there is a binding.gyp file in the root of your package,
  // npm will default the install command to compile using node-gyp.
  if (!scripts.install && (await utils.exists(path.join(root, 'binding.gyp')))) {
    options.console.warn(
      '[npminstall:runscript] %s found binding.gyp file, auto run "node-gyp rebuild", root: %j',
      displayName, root
    );
    scripts.install = 'node-gyp rebuild';
  }

  let scriptList = exports.DEFAULT_DEP_SCRIPTS;

  if (root === options.root || LOCAL_TYPES.includes(npa(`${originPkg.name}@${originPkg.version}`).type)) {
    scriptList = exports.DEFAULT_ROOT_SCRIPTS;
  }

  for (const script of scriptList) {
    const cmd = scripts[script];
    if (!cmd) {
      continue;
    }

    console.info(
      '> %s %s %s %s> %s',
      displayName,
      script,
      root,
      os.EOL,
      cmd
    );
    const startTime = Date.now();
    try {
      await utils.runScript(root, cmd, options);
    } catch (error) {
      options.console.warn('[npminstall:runscript:error] %s run %s %s error: %s', chalk.red(displayName), script, cmd, error);
      // If post install execute error, make sure this package won't be skipped during next installation.
      try {
        await utils.unsetInstallDone(root);
      } catch (e) {
        options.console.warn(chalk.yellow(`unsetInstallDone: ${root} error: ${e}, ignore it`));
      }
      if (originPkg.optional) {
        options.console.warn(chalk.red('%s optional error: %s'), displayName, error.stack);
        continue;
      }
      error.message = `run ${script} error, please remove node_modules before retry!\n${error.message}`;
      throw error;
    } finally {
      const ts = Date.now() - startTime;
      console.info('> %s %s, finished in %s', displayName, script, ms(ts));
      options.runscriptCount += 1;
      options.runscriptTime += ts;
    }
  }
};
