'use strict';

const Arborist = require('@npmcli/arborist');
const PackageService = require('./package_service');
const ArboristLogger = require('./arborist_logger');
const PACKAGE_SERVICE = Symbol.for('packageService');
const ROOT_PACKAGE = Symbol.for('rootPackage');

class LocalResolver {
  constructor(ctx, options) {
    this.ctx = ctx;
    this.options = options;
    this.packageService = new PackageService(options);
  }

  normalizeOptions(options) {
    const defaultOptions = {
      legacyPeerDeps: true,
    };
    return Object.assign(defaultOptions, options);
  }

  async resolve() {
    console.time('[npminstall] generate deps tree');
    const options = this.normalizeOptions(this.options);
    const logger = new ArboristLogger();
    const pkgLockJson = await this.generatePackageLockJson(this.ctx.pkg, {
      workDir: this.ctx.cwd,
      logger,
      ...options,
    });
    console.timeEnd('[npminstall] generate deps tree');
    return pkgLockJson;
  }

  async generatePackageLockJson(pkgJson, options) {
    const arboristOptions = {
      nodeVersion: pkgJson.engines && pkgJson.engines.node,
      npmVersion: pkgJson.engines && pkgJson.engines.npm,
      force: true,
      path: options.workDir,
      cache: options.cacheDir,
      log: options.logger,
      registry: this.options.registry,
      update: options.update,
      legacyPeerDeps: options.legacyPeerDeps,
      strictPeerDeps: options.strictPeerDeps,
      strictSSL: false,
      [PACKAGE_SERVICE]: this.packageService,
      [ROOT_PACKAGE]: pkgJson,
    };
    this.packageService.preload(pkgJson, true, arboristOptions);
    const arborist = new Arborist(arboristOptions);
    const idealTree = await arborist.buildIdealTree({});
    const meta = idealTree.meta;
    return meta.commit();
  }

}

module.exports = LocalResolver;
