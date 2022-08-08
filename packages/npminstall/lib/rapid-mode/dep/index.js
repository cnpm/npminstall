'use strict';

const DepContext = require('./dep_context');
const LocalResolver = require('./local_resolver');
const LocalCacheResolver = require('./local_cache_resolver');

// 依赖树解析优先级：
// 1. 指定的本地依赖
// 2. 服务端生成依赖
class DepResolver {
  /**
   * @param {object} options -
   * @param {string} options.root - 当前目录
   * @param {string} [options.cacheDir] - pacote cacheDir
   * @param {string} [options.registry] - pacote registry
   * @param {string} [options.downloader] - LocalResolver 预下载用
   * @param {string} options.pkg - 当前项目 package.json
   * @param {string} options.depsTreePath - 本地依赖树缓存路径
   * @param {object} options.update: 对比 package.json 是否有变化，更新依赖树
   * @param {boolean} options.all: 更新全部依赖，默认 false
   * @param {Array<string>} options.names: 更新指定依赖
   */
  constructor(options) {
    this.options = options;
    this.ctx = new DepContext(options);
  }

  async resolve() {
   if (this.ctx.depsTreePath) {
      try {
        const resolver = new LocalCacheResolver(this.ctx, this.options);
        return await resolver.resolve();
      } catch (e) {
        e.message = `resolve with package-lock.json: ${this.ctx.depsTreePath} failed: ` + e.message;
        console.warn(e);
      }
    }
    const resolver = new LocalResolver(this.ctx, this.options);
    return await resolver.resolve();
  }
}

module.exports = DepResolver;
