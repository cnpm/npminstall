'use strict';

const runscript = require('runscript');
const { rimraf, mkdirp } = require('../../utils');
const os = require('os');
const path = require('path');

const {
  tarBucketsDir,
  unionfs,
  BOOTSTRAP_BIN,
} = require('../constants');
const {
  wrapSudo, getWorkdir,
  getAllPkgPaths,
} = require('../util');
const nydusdApi = require('./nydusd_api');

async function startNydusFs(cwd, pkg) {
  await Promise.all([
    nydusdApi.initDaemon(),
    generateBootstrapFile(cwd, pkg),
  ]);

  await mountNydus(cwd, pkg);

  console.time('[npminstall] mount overlay');
  await mountOverlay(cwd, pkg);
  console.timeEnd('[npminstall] mount overlay');
}

async function generateBootstrapFile(cwd, pkg) {
  console.time('[npminstall] generate bootstrap');
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {
    const { bootstrap, tarIndex } = await getWorkdir(cwd, pkgPath);
    await mkdirp(path.dirname(bootstrap));
    await runscript(`${BOOTSTRAP_BIN} --stargz-config-path=${tarIndex} --stargz-dir=${tarBucketsDir} --bootstrap=${bootstrap}`);
  }));
  console.timeEnd('[npminstall] generate bootstrap');
}

async function mountNydus(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {
    const { dirname, bootstrap } = await getWorkdir(cwd, pkgPath);
    console.time(`[npminstall] mount '/${dirname}' to nydusd daemon using socket api`);
    await nydusdApi.mount(`/${dirname}`, cwd, bootstrap);
    console.timeEnd(`[npminstall] mount '/${dirname}' to nydusd daemon using socket api`);
  }));
}

async function mountOverlay(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {

    const {
      upper,
      workdir,
      mnt,
      overlay,
      nodeModulesDir,
    } = await getWorkdir(cwd, pkgPath);
    await mkdirp(nodeModulesDir);
    await mkdirp(overlay);
    if (os.type() === 'Linux') {
      await runscript(wrapSudo(`mount -t tmpfs tmpfs ${overlay}`));
    } else if (os.type() === 'Darwin') {
      await runscript(wrapSudo(`mount_tmpfs -o union -e ${overlay}`));
    }
    await mkdirp(upper);
    await mkdirp(workdir);

    let shScript = wrapSudo(`mount \
-t overlay overlay \
-o lowerdir=${mnt},upperdir=${upper},workdir=${workdir} \
${nodeModulesDir}`);

    if (os.type() === 'Darwin') {
      shScript = `${unionfs} \
-o cow,max_files=32768 \
-o allow_other,use_ino,suid,dev \
${upper}=RW:${mnt}=RO \
${nodeModulesDir}`;
    }
    console.info('[npminstall] mountOverlay: `%s`', shScript);
    await runscript(shScript);
    console.info('[npminstall] overlay mounted.');
  }));
}

async function endNydusFs(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {

    const {
      dirname,
      overlay,
      baseDir,
      nodeModulesDir,
    } = await getWorkdir(cwd, pkgPath);
    await runscript(wrapSudo(`umount ${nodeModulesDir}`));
    await runscript(wrapSudo(`umount ${overlay}`));
    await nydusdApi.umount(`/${dirname}`);
    // 清除 nydus 相关目录
    await rimraf(baseDir);
  }));
}

module.exports = {
  startNydusFs,
  endNydusFs,
};
