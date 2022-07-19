'use strict';

const pacote = require('pacote');

const REAL_MANIFEST = Symbol.for('pacote.manifest');
const PACKAGE_SERVICE = Symbol.for('pacote.packageService');

class PackageService {
  constructor(options) {
    this.cache = new Map();
    this.options = options;
    this.hijack();
  }

  // TODO replace with npminstall, keep the same logic
  async manifest(spec, options) {
    const cacheKey = this.cacheKey(spec);
    if (this.cache.has(cacheKey)) {
      return this._getCache(cacheKey);
    }
    const p = this.realManifeat(spec, options);
    this._setCacheTask(cacheKey, p);
    const manifest = await p;
    this._setCacheData(cacheKey, manifest);
    this.preload(manifest, false, options);
    this.preDownload(manifest);
    return this._getCache(cacheKey);
  }

  _setCacheTask(cacheKey, task) {
    this.cache.set(cacheKey, {
      resolved: false,
      task,
      data: null,
    });
  }

  _setCacheData(cacheKey, data) {
    this.cache.set(cacheKey, {
      resolved: true,
      task: null,
      data,
    });
  }

  async _getCache(cacheKey) {
    const cacheObj = this.cache.get(cacheKey);
    if (!cacheObj) return;
    if (cacheObj.resolved) {
      return cacheObj.data;
    }
    const obj = await cacheObj.task;
    return obj;
  }

  async preDownload(pkg) {
    if (!this.options.downloader) return;
    try {
      await this.options.downloader.downloadPkg(pkg);
    } catch (_) {
      // ..
    }
  }

  async preload(manifest, isRoot, options) {
    try {
      const dependencies = {
        ...manifest.dependencies,
        ...manifest.dependencies,
        ...(isRoot ? manifest.devDependencies : {}),
        ...manifest.peerDependencies,
        ...manifest.optionalDependencies,
      };
      await Promise.all(Object.entries(dependencies).map(([name, spec]) => {
        return this.manifest(`${name}@${spec}`, options);
      }));
    } catch (_) {
      // ...
    }
  }

  cacheKey(spec) {
    if (typeof spec === 'string') {
      return spec;
    } else {
      return spec.raw;
    }
  }

  hijack() {
    if (!pacote[REAL_MANIFEST]) {
      pacote[REAL_MANIFEST] = pacote.manifest;
    }
    this.realManifeat = pacote[REAL_MANIFEST];
    pacote[PACKAGE_SERVICE] = this;
    pacote.manifest = this.manifest.bind(this);
  }
}

module.exports = PackageService;
