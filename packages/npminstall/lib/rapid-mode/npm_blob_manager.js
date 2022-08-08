'use strict';

const Util = require('./util');

/**
 * @typedef {object} TocEntry
 * @property {string} name
 * @property {string} type - reg | dir
 * @property {number} size
 * @property {string} linkName
 * @property {number} mode
 * @property {number} uid
 * @property {number} gid
 * @property {string} userName
 * @property {string} groupName
 * @property {number} offset
 * @property {number} devMajor
 * @property {number} devMinor
 * @property {object} xattrs
 * @property {string} digest
 * @property {number} chunkOffset
 * @property {number} chunkSize
 */

/**
 * @typedef {object} TocIndex
 * @property {number} version
 * @property {Array<TocEntry>} entries
 */

class NpmBlobManager {
  constructor() {
    /** @type {Map<string, Map<string, TocIndex>>} - <PkgId, <BlobId, TocIndex>>*/
    this.blobs = new Map();
    /** @type {Map<string, PackageJson>} */
    this.packages = new Map();
  }

  addPackage(pkg) {
    const id = Util.generatePackageId(pkg.name, pkg.version);
    this.packages.set(id, pkg);
  }

  /**
   * @param {string} blobId
   * @param {TocIndex} tocIndex
   */
  addBlob(blobId, tocIndex) {
    for (const entry of tocIndex.entries) {
      const pkgId = this._getPkgIdFromName(entry);
      let pkgBlobs = this.blobs.get(pkgId);
      if (!pkgBlobs) {
        pkgBlobs = new Map();
        this.blobs.set(pkgId, pkgBlobs);
      }
      let pkgTocIndex = pkgBlobs.get(blobId);
      if (!pkgTocIndex) {
        pkgTocIndex = {
          version: tocIndex.version,
          entries: [],
        };
        pkgBlobs.set(blobId, pkgTocIndex);
      }
      pkgTocIndex.entries.push(entry);
    }
  }

  _getPkgIdFromName(entry) {
    return entry.name.substring(0, entry.name.indexOf('/'));
  }

  getPackage(name, version) {
    const id = Util.generatePackageId(name, version);
    return this.packages.get(id);
  }

  /**
   * @param name -
   * @param version -
   * @return {Map<string, TocIndex>} - <BlobId, TocIndex>
   */
  getTocIndexes(name, version) {
    const id = Util.generatePackageId(name, version);
    return this.blobs.get(id);
  }
}

module.exports = NpmBlobManager;
