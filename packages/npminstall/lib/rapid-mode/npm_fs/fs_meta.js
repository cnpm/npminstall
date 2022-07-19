'use strict';

/**
 * @typedef {object} TocEntryWithBlobId
 * @property {string} blobId
 * @property {TocEntry} entry
 */

/**
 * @typedef {object} BlobIdsTocIndexes
 * @property {Array<string>} blobIds -
 * @property {Array<TocEntryWithBlobId>} entries -
 */

class FsMeta {
  constructor() {
    this._blobIds = new Set();
    this._entries = new Map();
  }

  get blobIds() {
    return Array.from(this._blobIds);
  }

  get entries() {
    return Array.from(this._entries.values());
  }

  /**
   * @param {string} blobId
   * @param {TocEntry} entry
   */
  addEntry(blobId, entry) {
    this._blobIds.add(blobId);
    this._entries.set(entry.name, { blobId, entry });
  }

  /**
   * @return {BlobIdsTocIndexes}
   */
  dump() {
    return {
      blobIds: Array.from(this._blobIds),
      entries: Array.from(this._entries.values()),
    };
  }
}

module.exports = FsMeta;
