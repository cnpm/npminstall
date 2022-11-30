'use strict';

const debug = require('debug')('npminstall:rapid_mode:scripts');
const path = require('path');
const pMap = require('p-map');
const { mkdirp } = require('../utils');
const fs = require('fs/promises');
const chalk = require('chalk');
const ms = require('ms');
const os = require('os');
const runScript = require('../utils').runScript;
const preinstall = require('../preinstall');
const { NpmFsMode } = require('./npm_fs/constants');
const util = require('./util');
const {
  getDisplayName,
} = require('./util');

exports.Scripts = class Scripts {
  constructor(options) {
    this.options = options;

    this.preinstallTasks = [];
    this.postinstallTasks = [];
  }

  // @see: https://docs.npmjs.com/cli/v8/using-npm/scripts#npm-install
  static storeProjectScripts(options, preinstallTasks, postinstallTasks) {
    const { pkg } = options;
    const scripts = pkg.scripts || {};

    // preinstall
    if (scripts.preinstall) {
      preinstallTasks.unshift({
        pkg,
        root: process.cwd(),
        displayName: getDisplayName(pkg),
      });
    }

    // install/postinstall
    Scripts._storePostinstallScripts(pkg, '.', postinstallTasks);
  }

  async storePreinstallScripts(pkg, depPath) {
    // depPath: @mockscope/bigfish
    // npminstall mode: _@mockscope_bigfish@1.0.0/@mockscope/bigfish
    const { upper } = await util.getWorkdir(this.options.root);
    let root = path.join(upper, depPath);
    if (this.options.mode === NpmFsMode.NPMINSTALL) {
      root = path.join(upper, getDisplayName(pkg, this.options.mode));
    }
    const scripts = pkg.scripts || {};
    if (!scripts.preinstall || this.preinstallTasks.some(task => task.root === root)) {
      return;
    }

    debug('storePreinstallScripts, root: ', root);
    this.preinstallTasks.push({
      pkg,
      root,
      displayName: getDisplayName(pkg),
    });
  }

  static async runPreinstallScripts(preinstallTasks, options) {
    await pMap(preinstallTasks, async task => {
      const {
        pkg,
        root,
        displayName,
      } = task;
      await mkdirp(root);
      await preinstall(pkg, root, displayName, options);
    }, { concurrency: 100 });
  }

  static _storePostinstallScripts(pkg, packageStorePath, postinstallTasks, hasGyp) {
    // packageStorePath: node_modules/@mockscope/bigfish
    const displayName = getDisplayName(pkg);
    // copy from npminstall/lib/postinstall
    const scripts = pkg.scripts || {};

    // https://docs.npmjs.com/misc/scripts#default-values
    // "install": "node-gyp rebuild"
    // If there is a binding.gyp file in the root of your package,
    // npm will default the install command to compile using node-gyp.
    if (!scripts.install && hasGyp) {

      postinstallTasks.push({
        pkg: Object.assign({}, pkg, {
          scripts: {
            install: 'node-gyp rebuild',
          },
        }),
        root: packageStorePath,
        optional: false,
        displayName,
      });
    }

    if (scripts.install || scripts.postinstall) {
      if (postinstallTasks.some(task => task.root === packageStorePath)) {
        return;
      }
      postinstallTasks.push({
        pkg,
        root: packageStorePath,
        optional: false,
        displayName,
      });
    }
  }

  storePostinstallScripts(pkg, packageStorePath, hasGyp) {
    Scripts._storePostinstallScripts(pkg, packageStorePath, this.postinstallTasks, hasGyp);
  }

  static async runPostinstallScripts(postinstallTasks, options) {
    let count = 0;
    const total = postinstallTasks && postinstallTasks.length;
    if (total && options.ignoreScripts) {
      console.warn(chalk.yellow('ignore all post install scripts'));
      return;
    }

    if (total) {
      console.log(chalk.yellow(`[npminstall] execute post install ${total} scripts...`));
    }

    for (const task of postinstallTasks) {
      count++;
      const pkg = task.pkg;
      const root = path.join(options.root, task.root);
      const displayName = task.displayName;
      const installScript = pkg.scripts.install;
      const postinstallScript = pkg.scripts.postinstall;
      try {
        // ref: https://docs.npmjs.com/cli/v7/using-npm/scripts#npm-install
        // npm registry 会在模块根目录有 binding.gyp 且无 preinstall 和 install 的时候
        // 设置 scripts.install 为 `node-gyp rebuild`
        // 可以参照 fsevents@2.3.2 模块
        //   npm registry 的输出：https://registry.npmjs.com/fsevents/2.3.2
        //   源码：https://github.com/fsevents/fsevents/blob/master/package.json#L18
        // 所以这里需要处理一下这个问题的逆否情况，即
        // 如果不存在 binding.gyp 且 scripts.install 为`node-gyp install` 时跳过脚本执行
        if (installScript) {
          const defaultCmd = 'node-gyp rebuild';
          try {
            await fs.stat(path.join(root, 'binding.gyp'));
          } catch (_) {
            if (installScript === defaultCmd) {
              console.warn(
                '%s %s skip running %j, root: %j',
                chalk.yellow(`[${count}/${total}] scripts.install`),
                chalk.gray(displayName),
                installScript,
                root
              );
              continue;
            }
          }
          console.warn(
            '%s %s run %j, root: %j',
            chalk.yellow(`[${count}/${total}] scripts.install`),
            chalk.gray(displayName),
            installScript,
            root
          );
          const start = Date.now();
          try {
            await runScript(root, installScript, options);
          } catch (err) {
            console.warn('[npminstall:runscript:error] %s scripts.install run %j error: %s',
              chalk.red(displayName), installScript, err);
            throw err;
          }
          console.warn(
            '%s %s finished in %s',
            chalk.yellow(`[${count}/${total}] scripts.install`),
            chalk.gray(displayName),
            ms(Date.now() - start)
          );
        }
        if (postinstallScript) {
          console.warn(
            '%s %s run %j, root: %j',
            chalk.yellow(`[${count}/${total}] scripts.postinstall`),
            chalk.gray(displayName),
            postinstallScript,
            root
          );
          const start = Date.now();
          try {
            await runScript(root, postinstallScript, options);
          } catch (err) {
            console.warn('[npminstall:runscript:error] %s scripts.postinstall run %j error: %s',
              chalk.red(displayName), postinstallScript, err);
            throw err;
          }
          console.warn(
            '%s %s finished in %s',
            chalk.yellow(`[${count}/${total}] scripts.postinstall`),
            chalk.gray(displayName),
            ms(Date.now() - start)
          );
        }
      } catch (err) {
        if (task.optional) {
          console.warn(chalk.red('%s optional error: %s'), displayName, err.stack);
          continue;
        }
        err.message = `post install error, please remove node_modules before retry!${os.EOL}${err.message}`;
        throw err;
      }
    }
    options.spinner && options.spinner.succeed(`Run ${total} scripts`);
  }

  static async runProjectExtraScripts(options) {
    const {
      root,
      pkg,
    } = options;

    const scripts = pkg.scripts || {};

    const types = [
      'prepublish',
      'preprepare',
      'prepare',
      'postprepare',
    ];

    for (const type of types) {
      const script = scripts[type];
      if (script) {
        options.console.warn(
          '[npminstall:runscript] %s %s %j, root: %j',
          chalk.yellow(`scripts.${type}`),
          chalk.gray(`${pkg.name}@${pkg.version}`),
          script,
          root
        );
        await runScript(root, script, options);
      }
    }
  }
};
