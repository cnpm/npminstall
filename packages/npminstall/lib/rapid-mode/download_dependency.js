'use strict';

const path = require('path');
const { rimraf, mkdirp } = require('../utils');
const fs = require('fs').promises;
const {
  tarBucketsDir,
  npmCacheConfigPath,
} = require('./constants');
const { parseTarballUrl } = require('./util');
const util = require('./util');
const { Scripts } = require('./scripts');
const DepResolver = require('./dep');
const NpmBlobManger = require('./npm_blob_manager');
const NpmFs = require('./npm_fs');
const { NpmFsMode } = require('./npm_fs/constants');
const Util = require('./util');
const Downloader = require('./downloader');

/**
 * @param {NpmBlobManger} blobManger -
 * @return {(function(*))|*} -
 */
function entryListenerFactory(blobManger) {
  return function entryListener(entry) {
    // 路径为 packages/package.json
    // 其他路径如 packages/test/package.json 则忽略
    if (entry.entryName.split('/').length !== 2) {
      return;
    }
    blobManger.addPackage(JSON.parse(entry.content));
  };
}

async function download(options) {
  // 1. resolve dependencies
  // 2. download tar
  //   - listen and store package entry
  // 3. prepare preInstall/postInstall scripts
  console.info('[npminstall] removing tar buckets. dir: %s', tarBucketsDir);
  const { baseDir } = await util.getWorkdir(options.root);
  // 防止多次安装，realBucketCount 不同时数据错乱
  await rimraf(path.join(tarBucketsDir, '*'));
  await rimraf(path.join(baseDir, '*'));

  const blobManger = new NpmBlobManger();
  const entryListener = entryListenerFactory(blobManger);
  const downloader = new Downloader({
    entryListener,
    productionMode: options.productionMode,
  });
  await downloader.init();
  options.downloader = downloader;
  const resolver = new DepResolver(options);
  const depsTree = await resolver.resolve();

  console.time('[npminstall] parallel download time');
  const tocIndexes = await downloader.download(depsTree);
  await downloader.shutdown();

  for (const [ blobId, tocIndex ] of Object.entries(tocIndexes)) {
    blobManger.addBlob(blobId, tocIndex);
  }

  const scripts = new Scripts(options);
  for (const [ name, { version, resolved, optional, link }] of Object.entries(depsTree.packages)) {
    if (!name.startsWith('node_modules') || link === true) {
      continue;
    }
    const depPath = name.substr('node_modules/'.length);
    const { name: pkgName } = parseTarballUrl(resolved);
    const pkg = blobManger.getPackage(pkgName, version);

    if (!pkg) {
      if (!optional) {
        const pkgId = Util.generatePackageId(pkgName, version);
        throw new Error(`not found package json for ${pkgId}`);
      }
    } else {
      let postinstallRoot = name;
      if (options.mode === NpmFsMode.NPMINSTALL) {
        postinstallRoot = path.join('./node_modules', Util.getDisplayName(pkg, options.mode));
      }
      await scripts.storePreinstallScripts(pkg, depPath);
      scripts.storePostinstallScripts(pkg, postinstallRoot);
    }
  }
  console.timeEnd('[npminstall] parallel download time');

  console.time('[npminstall] generate fs meta');
  const npmFs = new NpmFs(blobManger, options);

  const allPkgs = await util.getAllPkgPaths(options.root, options.pkg);
  await Promise.all(allPkgs.map(async pkgPath => {
    const { tarIndex } = await util.getWorkdir(options.root, pkgPath);
    const fsMeta = await npmFs.getFsMeta(depsTree, pkgPath);
    await mkdirp(path.dirname(tarIndex));
    await fs.writeFile(tarIndex, JSON.stringify(fsMeta), 'utf8');
  }));
  await fs.writeFile(npmCacheConfigPath, JSON.stringify(tocIndexes), 'utf8');
  console.timeEnd('[npminstall] generate fs meta');
  return {
    depsTree,
    preinstallTasks: scripts.preinstallTasks,
    postinstallTasks: scripts.postinstallTasks,
  };
}

exports.download = download;
