'use strict';

const path = require('path');
const FsMeta = require('./fs_meta');
const Util = require('../util');
const { NpmFsMode, PREFIX_LENGTH } = require('./constants');
const semver = require('semver');

class TnpmFsBuilder {
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
    this.mode = NpmFsMode.NPMINSTALL;
    this.productionMode = options.productionMode;
    // fork from: https://github.com/cnpm/npminstall/blob/master/lib/install.js#L157
    this.latestVersions = new Map();
    this.projectVersions = new Map();
  }

  generateFsMeta(packageLockJson) {
    this.getProjectVersions(packageLockJson);
    this.getLatestVersions(packageLockJson);
    this.createRealPkgs(packageLockJson);

    // 模拟项目依赖的软链，在 blobs 中不存在，随便放一个 blobs 中即可，下面 root dir 同理
    const blobId = this.fsMeta.blobIds[0];
    const packages = packageLockJson.packages;
    for (const [ pkgPath, pkgItem ] of Object.entries(packages)) {
      if (this.shouldSkipGenerate(pkgPath, pkgItem)) continue;
      const name = Util.getPackageNameFromPackagePath(pkgPath, packages);
      const version = pkgItem.version;
      const originName = Util.getAliasPackageNameFromPackagePath(pkgPath, packages);
      this.createPkgDepLinks(name, version, pkgPath, packageLockJson, blobId);
      this.createFlattenDepLinks(name, version, originName, blobId);
    }
    const rootDir = Util.rootDir(this.uid, this.gid);
    this.fsMeta.addEntry(blobId, rootDir);
    return this.fsMeta.dump();
  }

  createRealPkgs(packageLockJson) {
    const packages = packageLockJson.packages;
    for (const [ pkgPath, pkgItem ] of Object.entries(packages)) {
      if (this.shouldSkipGenerate(pkgPath, pkgItem)) continue;
      const name = Util.getAliasPackageNameFromPackagePath(pkgPath, packages);
      const version = pkgItem.version;
      this.createPackageMeta(name, version, pkgPath);
    }
  }

  createPkgDepLinks(name, version, pkgPath, pkgLockJson, blobId) {
    const displayName = Util.getDisplayName({ name, version }, this.mode);
    const pkg = this.blobManager.getPackage(name, version);
    if (!pkg) return;
    const dependencies = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.optionalDependencies || {}),
    ];
    const bundledDependencies = pkg.bundledDependencies || pkg.bundleDependencies || [];
    for (const dependency of dependencies) {
      if (bundledDependencies.includes(dependency)) {
        continue;
      }
      const dependencyPath = this.findDependencyPath(pkgPath, dependency, pkgLockJson);
      if (this.shouldSkipGenerate(dependencyPath, pkgLockJson.packages[dependencyPath])) {
        console.warn(`can not find dependency ${dependency} for ${name}@${version}`);
        continue;
      }
      const dependencyVersion = pkgLockJson.packages[dependencyPath].version;
      const dependencyRelativePath = path.join(displayName, 'node_modules', dependency);
      const dependencyRealPath = Util.getDisplayName({ name: dependency, version: dependencyVersion }, this.mode);
      const linkPath = path.relative(path.dirname(dependencyRelativePath), dependencyRealPath);
      this.fsMeta.addEntry(blobId, Util.generateSymbolLink(dependencyRelativePath, linkPath, this.uid, this.gid, true));
      this.linkBin(dependency, dependencyVersion, dependencyRelativePath, blobId);
    }
  }

  linkBin(name, version, parentPath, blobId) {
    const pkg = this.blobManager.getPackage(name, version);
    const displayName = Util.getDisplayName({ name, version }, this.mode);
    if (!pkg) return;
    const bin = pkg.bin || {};
    for (const [ binName, binPath ] of Object.entries(bin)) {
      const entryNewName = path.join(displayName, binPath);
      const binEntry = Util.generateBin({
        binName,
        binPath: entryNewName,
        pkgPath: parentPath,
        uid: this.uid,
        gid: this.gid,
      });
      this.fsMeta.addEntry(blobId, binEntry);
    }
  }

  findDependencyPath(pkgPath, dependency, pkgLockJson) {
    // 依赖寻找路径
    // 1. 包的子 node_modules 下有没有
    // 1. 向父目录的 node_modules 寻找
    const subPath = path.join(pkgPath, 'node_modules', dependency);
    if (pkgLockJson.packages[subPath]) {
      return subPath;
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const parentPathEnd = pkgPath.lastIndexOf('node_modules');
      if (parentPathEnd < 0) {
        return;
      }
      pkgPath = pkgPath.substring(0, parentPathEnd);
      const tryPath = path.join(pkgPath, 'node_modules', dependency);
      if (pkgLockJson.packages[tryPath]) {
        return tryPath;
      }
    }
  }

  createFlattenDepLinks(name, version, originName, blobId) {
    if (this.latestVersions.get(name) !== version) return;
    const displayName = Util.getDisplayName({ name: originName, version }, this.mode);
    const linkPath = path.relative(path.dirname(path.join('node_modules', name)), path.join('node_modules', displayName));
    this.fsMeta.addEntry(blobId, Util.generateSymbolLink(name, linkPath, this.uid, this.gid, true));
  }

  createPackageMeta(name, version, pkgPath) {
    pkgPath = pkgPath.substring(PREFIX_LENGTH);
    const pkgId = Util.generatePackageId(name, version);
    const displayName = Util.getDisplayName({ name, version }, this.mode);

    const pkg = this.blobManager.getPackage(name, version);
    if (!pkg) return;
    const reverseBinMap = Util.resolveBinMap(pkg);
    const tocIndexes = this.blobManager.getTocIndexes(name, version);
    for (const [ blobId, tocIndex ] of tocIndexes) {
      for (const entry of tocIndex.entries) {
        // blobId 中 name 是 foo@1.0.0/index.js
        // 需要替换成 _foo@1.0.0@foo/index.js
        const relatedPath = entry.name.substr(pkgId.length + 1);
        const entryNewName = path.join(displayName, relatedPath);
        this.fsMeta.addEntry(blobId, {
          ...entry,
          mode: Util.getFileEntryMode(pkgId, pkg, entry),
          uid: this.uid,
          gid: this.gid,
          uname: 'admin',
          gname: 'admin',
          name: entryNewName,
        });
        // 补全 bin 文件，npminstall 中只有项目直接依赖的 bin 才会创建软链
        if (reverseBinMap[path.normalize(relatedPath)] && this.isProjectDep(name, version)) {
          reverseBinMap[relatedPath].forEach(binName => {
            const binEntry = Util.generateBin({
              binName,
              binPath: entryNewName,
              pkgPath,
              uid: this.uid,
              gid: this.gid,
            });
            this.fsMeta.addEntry(blobId, binEntry);
          });
        }
      }
    }
  }

  isProjectDep(name, version) {
    return this.projectVersions.get(name) === version;
  }

  // 项目依赖的判定方式：
  // 1. node_modules/xxx 一定包含所有项目依赖，且不会存在两个版本
  // 2. 剔除 xxx 不在项目依赖的部分
  getProjectVersions(packageLockJson) {
    const projectPkg = packageLockJson.packages[''];
    // https://docs.npmjs.com/cli/v8/configuring-npm/package-json/
    // @npm/arborist 默认 devDependencies 会覆盖 dependencies
    // 这里顺序保持一致
    const dependencies = {
      ...(projectPkg.dependencies || {}),
      ...(projectPkg.devDependencies || {}),
    };

    for (const [ pkgPath, pkgItem ] of Object.entries(packageLockJson.packages)) {
      if (Util.isFlattenPackage(pkgPath)) {
        const name = Util.getPackageNameFromPackagePath(pkgPath);
        const version = pkgItem.version;
        // 这里不需要判断版本是否满足要求，node_modules/xxx 一定是满足要求的
        if (dependencies[name]) {
          this.projectVersions.set(name, version);
        }
      }
    }
  }

  shouldSkipGenerate(pkgPath, pkgItem) {
    return !pkgPath || !Util.validDep(pkgItem, this.productionMode);
  }

  // 直接根据依赖树算出需要打平的，每个最大版本的依赖
  // 1. 项目直接依赖强制打平
  // 2. 非项目直接依赖，打平最大版本号
  getLatestVersions(packageLockJson) {
    for (const [ pkgPath, pkgItem ] of Object.entries(packageLockJson.packages)) {
      if (this.shouldSkipGenerate(pkgPath, pkgItem)) continue;
      const name = Util.getPackageNameFromPackagePath(pkgPath);
      const version = pkgItem.version;

      const existingVersion = this.latestVersions.get(name);
      if (!existingVersion) {
        // 不存在直接存
        this.latestVersions.set(name, version);
      } else if (!this.isProjectDep(name, existingVersion) && semver.gt(version, existingVersion)) {
        // 已存在，不为项目依赖，且版本更大
        this.latestVersions.set(name, version);
      }
    }
  }
}

module.exports = TnpmFsBuilder;
