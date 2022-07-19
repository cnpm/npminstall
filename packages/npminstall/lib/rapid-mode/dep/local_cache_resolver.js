'use strict';

const fs = require('fs').promises;

class LocalCacheResolver {
  /**
   * @param {DepContext} ctx -
   * @param options
   */
  constructor(ctx, options) {
    this.depsTreePath = ctx.depsTreePath;
  }

  async resolve() {
    try {
      console.time('[npminstall] resolve local deps tree');
      const depTreeString = await fs.readFile(this.depsTreePath, 'utf8');
      const depsTree = JSON.parse(depTreeString);
      console.timeEnd('[npminstall] resolve local deps tree');
      return depsTree;
    } catch (e) {
      e.message = `read dep tree from ${this.depsTreePath} failed: ${e.message}`;
      throw e;
    }
  }
}

module.exports = LocalCacheResolver;
