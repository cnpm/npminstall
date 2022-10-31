'use strict';

const Util = require('./util');
const { tarBucketsDir } = require('./constants');
const os = require('os');

const platform = os.platform();
const arch = os.arch();

class Downloader {
  /**
   * @param {object} options -
   * @param {number} [options.bucketCount] -
   * @param {number} [options.downloadTimeout] -
   * @param {number} [options.httpConcurrentCount] -
   * @param {string} [options.platform] -
   * @param {string} [options.arch] -
   * @param {boolean} [options.production] -
   * @param {{function(*)}} [options.entryListener] -
   */
  constructor(options) {
    this.entryListener = options.entryListener;
    this.bucketCount = options.bucketCount || 40;
    this.downloadTimeout = options.downloadTimeout || 2 * 60 * 1000;
    this.httpConcurrentCount = options.httpConcurrentCount || 20;
    this.platform = options.platform || platform;
    this.arch = options.arch || arch;
    this.production = options.production;
    this.rapidDownloader = this.createRapidDownloader();
    this.taskMap = new Map();
  }

  async init() {
    await this.rapidDownloader.init();
  }

  async shutdown() {
    if (!this.rapidDownloader) return;
    await this.rapidDownloader.shutdown();
  }

  createRapidDownloader() {
    const { Downloader } = require('@cnpmjs/binding');
    return new Downloader({
      bucketCount: this.bucketCount,
      httpConcurrentCount: this.httpConcurrentCount,
      downloadDir: tarBucketsDir,
      entryWhitelist: [ '*/package.json' ],
      entryListener: this.entryListener,
      downloadTimeout: this.downloadTimeout,
    });
  }

  async download(pkgLockJson) {
    const tasks = this.createDownloadTask(pkgLockJson);
    await this.rapidDownloader.batchDownloads(tasks);
    const dataStr = this.rapidDownloader.dump();
    const data = JSON.parse(dataStr);
    return data.tocMap;
  }

  async downloadPkg(pkg) {
    const { name, version } = pkg;
    const taskId = Util.generatePackageId(name, version);
    const task = {
      id: taskId,
      name,
      version,
      sha: pkg.integrity || pkg._integrity,
      url: pkg.resolved || pkg._resolved,
      pkg,
    };
    return await this.doDownloadTask(task);
  }

  verifyDownloadTask(task) {
    const { pkg } = task;
    if (pkg.os) {
      if (!Util.verifyNpmConstraint(pkg.os, this.platform)) {
        console.warn('package %s@%s only support %j current is %s', task.name, task.version, pkg.os, this.platform);
        if (pkg.optional) {
          return false;
        }
      }
    }
    if (pkg.cpu) {
      if (!Util.verifyNpmConstraint(pkg.cpu, this.arch)) {
        console.warn('package %s@%s only support %j current is %s', task.name, task.version, pkg.cpu, this.arch);
        if (pkg.optional) {
          return false;
        }
      }
    }
    if (this.production === true && pkg.dev === true) {
      return false;
    }
    return true;
  }

  createDownloadTask(pkgLockJson) {
    const taskMap = new Map();
    for (const [ name, pkg ] of Object.entries(pkgLockJson.packages)) {
      // 根目录忽略，软链接忽略，workspace 子包忽略
      if (name === '' || pkg.link === true || (!pkg.resolved && !pkg.link)) continue;
      const {
        name: pkgName,
        version: pkgVersion,
      } = Util.parseTarballUrl(pkg.resolved);
      const taskId = Util.generatePackageId(pkgName, pkgVersion);
      taskMap.set(taskId, {
        id: taskId,
        name: pkgName,
        version: pkgVersion,
        sha: pkg.integrity,
        url: pkg.resolved,
        pkg,
      });
    }
    const tasks = Array.from(taskMap.values());
    return tasks.filter(task => {
      return this.verifyDownloadTask(task);
    });
  }

  async doDownloadTask(task) {
    let { downloadTask } = this.taskMap.get(task.id) || {};
    if (downloadTask) {
      return downloadTask;
    }
    downloadTask = this.rapidDownloader.download(task);
    this.taskMap.set(task.id, {
      downloadTask,
      task,
    });
    try {
      const result = await downloadTask;
      return result;
    } catch (e) {
      task.retryTime = (task.retryTime || 0) + 1;
      if (task.retryTime > 3) {
        throw e;
      } else {
        console.log('retry task %j', task);
        this.taskMap.delete(task.id);
        return this.doDownloadTask(task);
      }
    }
  }
}

module.exports = Downloader;
