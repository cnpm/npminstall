'use strict';

const path = require('path');
const FsMeta = require('./fs_meta');
const { PREFIX_LENGTH } = require('./constants');
const Util = require('../util');
const PackageLock = require('../package_lock').PackageLock;

class NpmFsMetaBuilder {
  /**
   * @param {NpmBlobManager} blobManager -
   * @param {object} options -
   * @param {object} options.uid -
   * @param {object} options.gid -
   */
  constructor(blobManager, options) {
    this.blobManager = blobManager;
    this.fsMeta = new FsMeta();
    this.uid = options.uid;
    this.gid = options.gid;
    this.cwd = options.root;
    this.productionMode = options.productionMode;
  }

  async generateFsMeta(packageLockJson, currentPkgPath) {
    const packageLock = new PackageLock({ cwd: this.cwd, packageLockJson });
    await packageLock.load();
    const packages = packageLock.packages;
    for (const [ pkgPath, pkgItem ] of Object.entries(packages)) {
      if (!pkgPath || !Util.validDep(pkgItem, this.productionMode)) continue;
      // npm alias or normal npm package
      const name = Util.getAliasPackageNameFromPackagePath(pkgPath, packages);
      const version = pkgItem.version;
      // node_modules 目录需要处理所有的提升过的依赖
      // 子目录需要处理自己的依赖
      if ((packageLock.isRootPkg(currentPkgPath) && pkgPath.startsWith('node_modules/')) || (!packageLock.isRootPkg(currentPkgPath) && pkgPath.startsWith(currentPkgPath))) {
        this.createPackageMeta(name, version, pkgPath, currentPkgPath);
      }
    }

    const blobId = this.fsMeta.blobIds[0] || 'bucket_0.stgz';
    const rootDir = Util.rootDir(this.uid, this.gid);
    // 生成根目录
    this.fsMeta.addEntry(blobId, rootDir);

    // 生成 workspace 子目录
    if (packageLock.isRootPkg(currentPkgPath)) {
      const workspaceDeps = packageLock.getWorkspaceDeps(packageLock.data);
      workspaceDeps.forEach(dep => {
        const { source, target } = dep;
        const name = Util.getAliasPackageNameFromPackagePath(source, packages);
        const linkPath = path.relative(path.dirname(source), target);
        this.fsMeta.addEntry(blobId, Util.generateSymbolLink(name, linkPath, this.uid, this.gid, true));
      });
    }
    return this.fsMeta.dump();
  }

  createPackageMeta(name, version, packagePath, currentPkgPath) {
    packagePath = path.relative(currentPkgPath, packagePath).substring(PREFIX_LENGTH);
    const pkgId = Util.generatePackageId(name, version);

    const pkg = this.blobManager.getPackage(name, version);
    if (!pkg) return;
    const reverseBinMap = Util.resolveBinMap(pkg);
    const tocIndexes = this.blobManager.getTocIndexes(name, version);
    for (const [ blobId, tocIndex ] of tocIndexes) {
      for (const entry of tocIndex.entries) {
        // blobId 中 name 是 foo@1.0.0/index.js
        // 需要替换成  bar/node_modules/foo/index.js
        const relatedPath = entry.name.substr(pkgId.length + 1);
        const entryNewName = path.join(packagePath, relatedPath);
        this.fsMeta.addEntry(blobId, {
          ...entry,
          mode: Util.getFileEntryMode(pkgId, pkg, entry),
          uid: this.uid,
          gid: this.gid,
          uname: 'admin',
          gname: 'admin',
          name: entryNewName,
        });
        // 补全 bin 文件
        if (reverseBinMap[path.normalize(relatedPath)]) {
          reverseBinMap[relatedPath].forEach(binName => {
            const binEntry = Util.generateBin({
              binName,
              binPath: entryNewName,
              pkgPath: packagePath,
              uid: this.uid,
              gid: this.gid,
            });
            this.fsMeta.addEntry(blobId, binEntry);
          });
        }
      }
    }
  }
}

module.exports = NpmFsMetaBuilder;
