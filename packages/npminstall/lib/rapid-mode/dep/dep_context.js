'use strict';

const assert = require('assert');

/**
 * 依赖计算上下文
 */
class DepContext {
  /**
   * @param {object} options -
   * @param {string} options.cwd - 当前目录
   * @param {string} options.root - 当前项目 package.json
   * @param {string} options.depsTreePath - 本地依赖树缓存路径
   * @param {object} options.update: 对比 package.json 是否有变化，更新依赖树
   * @param {boolean} options.all: 更新全部依赖，默认 false
   * @param {Array<string>} options.names: 更新指定依赖
   */
  constructor(options) {
    this.cwd = options.root;
    this.depsTreePath = options.depsTreePath;
    this.pkg = options.pkg;
    this.update = options.update || {
      all: false,
      names: [],
    };
  }
}

module.exports = DepContext;
