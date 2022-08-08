'use strict';

const fs = require('fs');
const assert = require('assert');
const { mkdirp } = require('../utils');
const promisify = require('util').promisify;
const path = require('path');
const runscript = require('runscript');
const downloadDependency = require('./download_dependency');
const Scripts = require('./scripts').Scripts;
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const DepResolver = require('./dep');
const {
  nydusdConfigFile,
  tarBucketsDir,
  NYDUS_TYPE,
} = require('./constants');
const {
  createNydusdConfigFile,
  shouldFuseSupport,
  getEnv,
} = require('./util');
const util = require('./util');
const nydusd = require('./nydusd');

// 有依赖树（package-lock.json）走 npm i 安装
exports.forceFallbackInstall = async options => {
  const resolver = new DepResolver(options);
  const depsTreeJSON = await resolver.resolve();
  // 强制写到 `${process.cwd()}/package-lock.json` 然后进行安装
  // 先保存已有的 package-lock.json
  const packageLockPath = path.join(options.root, 'package-lock.json');
  const isExists = await exists(packageLockPath);
  if (isExists) {
    await runscript(`mv ${packageLockPath} ${packageLockPath}.bak`);
  }

  await writeFile(packageLockPath, JSON.stringify(depsTreeJSON), 'utf-8');
};

// 有依赖树（package-lock.json）走 npm / npminstall 极速安装
exports.install = async options => {
  // set args to npm_config_xx env
  options.env = getEnv(options.env, options.args);
  const nydusMode = await nydusd.getNydusMode();
  if (nydusMode === NYDUS_TYPE.NONE) {
    await shouldFuseSupport();
  }

  const allPkgs = await util.getAllPkgPaths(options.root, options.pkg);
  await Promise.all(allPkgs.map(pkgPath => async () => {
    const { baseDir, tarIndex } = await util.getWorkdir(options.root, pkgPath);
    await mkdirp(baseDir);
    await mkdirp(path.dirname(tarIndex));
  }));
  await mkdirp(tarBucketsDir);
  await createNydusdConfigFile(nydusdConfigFile);

  const {
    depsTree: depsJSON,
    preinstallTasks,
    postinstallTasks,
  } = await downloadDependency.download(options);
  // current project installation scripts should be executed
  Scripts.storeProjectScripts(options, preinstallTasks, postinstallTasks);

  assert(Object.keys(depsJSON).length, '[npminstall] depsJSON invalid.');

  console.time('[npminstall] run preinstall scripts');
  await Scripts.runPreinstallScripts(preinstallTasks, options);
  console.timeEnd('[npminstall] run preinstall scripts');

  await nydusd.startNydusFs(nydusMode, options.root, options.pkg);
  // 执行 postinstall
  console.time('[npminstall] run postinstall scripts');
  await Scripts.runPostinstallScripts(postinstallTasks, options);
  // 执行 project prepublish/preprepare/prepare/postprepare 脚本
  await Scripts.runProjectExtraScripts(options);
  console.timeEnd('[npminstall] run postinstall scripts');
  // 写入依赖树缓存
  const { depsJSONPath } = await util.getWorkdir(options.root);
  await writeFile(depsJSONPath, JSON.stringify(depsJSON), 'utf8');
};
