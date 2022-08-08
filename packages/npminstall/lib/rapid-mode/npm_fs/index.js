'use strict';

const assert = require('assert');
const NpmFsBuilder = require('./npm_fs_builder');
const TnpmFsBuilder = require('./tnpm_fs_builder');
const { NpmFsMode } = require('./constants');

class NpmFs {
  /**
   * @param {NpmBlobManager} blobManger -
   * @param {object} [options] -
   * @param {string} [options.mode] -
   * @param {number} [options.uid] -
   * @param {number} [options.gid] -
   */
  constructor(blobManger, options) {
    this.blobManager = blobManger;
    this.options = Object.assign({
      uid: process.getuid(),
      gid: process.getgid(),
      mode: NpmFsMode.NPM,
    }, options);
  }

  get mode() {
    return this.options.mode;
  }

  async getFsMeta(pkgLockJson, pkgPath = '') {
    const builderClazz = this._getFsMetaBuilder();
    const builder = new builderClazz(this.blobManager, this.options);
    return await builder.generateFsMeta(pkgLockJson, pkgPath);
  }

  _getFsMetaBuilder() {
    switch (this.mode) {
      case NpmFsMode.NPM:
        return NpmFsBuilder;
      case NpmFsMode.NPMINSTALL:
        return TnpmFsBuilder;
      default:
        assert.fail(`npm fs mode: ${this.mode} not impl`);
    }
  }
}

module.exports = NpmFs;
