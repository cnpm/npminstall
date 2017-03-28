'use strict';

const debug = require('debug')('npminstall:format_install_options');
const os = require('os');
const uuid = require('uuid');
const awaitEvent = require('await-event');
const assert = require('assert');
const path = require('path');
const EventEmitter = require('events');
const ora = require('ora');

module.exports = function formatInstallOptions(options) {
  options.trace = !!options.trace;
  if (options.trace) {
    // make sure detail enable when trace enable
    options.detail = true;
  }

  options.spinner = options.detail ? null : ora();
  options.events = new EventEmitter();
  // close EventEmitter memory leak warning
  options.events.setMaxListeners(0);
  options.events.await = awaitEvent;

  options.postInstallTasks = [];
  // [
  //    {package: pkg, parentDir: 'parentDir', packageDir: 'packageDir'},
  //   ...
  // ]
  options.peerDependencies = [];
  // [
  //   { parentDir, realPkg, realPkgDir }
  // ]
  options.linkPeerDependencies = [];
  // {
  //   pkg: Set('version1', 'version2')
  // }
  options.packageVersions = {};

  // support forbiddenLicenses
  if (options.forbiddenLicenses && options.forbiddenLicenses.length) {
    options.forbiddenLicensesRegex = new RegExp(options.forbiddenLicenses.join('|'), 'i');
  }

  options.latestVersions = new Map();
  // store latest packages
  options.latestPackages = new Map();
  options.cache = {};
  assert(options.root && typeof options.root === 'string', 'options.root required and must be string');
  options.registry = options.registry || 'https://registry.npmjs.org';
  if (!options.targetDir) {
    options.targetDir = options.root;
  }
  if (!options.storeDir) {
    options.storeDir = path.join(options.targetDir, 'node_modules');
  }
  options.timeout = options.timeout || 60000;
  const customConsole = options.detail ? console : {
    info: debug,
    log: debug,
    error: console.error,
    warn: console.warn,
  };
  options.console = options.console || customConsole;
  options.env = options.env || {};
  options.start = Date.now();
  options.totalTarballSize = 0;
  options.totalJSONSize = 0;
  options.totalJSONCount = 0;
  options.localPackages = 0;
  options.remotePackages = 0;
  options.registryPackages = 0;
  options.gitPackages = 0;
  options.binaryMirrors = options.binaryMirrors || {};
  const defaultCacheDir = path.join(os.homedir(), '.npminstall_tarball');
  if (options.cacheStrict) {
    options.cacheDir = options.cacheDir || defaultCacheDir;
  } else {
    if (options.production) {
      options.cacheDir = '';
    } else {
      if (typeof options.cacheDir !== 'string') {
        options.cacheDir = defaultCacheDir;
      }
    }
  }
  // https://github.com/sass/node-sass/blob/master/lib/extensions.js#L270
  // make sure npm_config_cache env exists
  options.env.npm_config_cache = options.env.npm_config_cache || options.cacheDir || defaultCacheDir;

  options.pendingMessages = [];

  // log packages update in 7 days
  options.recentlyUpdateMinDateTime = options.recentlyUpdateMinDateTime || Date.now() - 7 * 24 * 3600000;
  // { name@version:  }
  options.recentlyUpdates = new Map();
  // production mode: log all message to console
  // other: only show today message to console
  options.onlyShowTodayUpdateToConsole = !options.production;
  // record all the packages' name which install from remote/git/hosted
  options.remoteNames = {};

  options.pkgs = options.pkgs || [];

  options.referer = 'install';
  if (options.pkgs.length > 0) {
    options.referer += ' ' + options.pkgs.map(pkg => pkg.name).join(' ');
  }
  if (options.production) {
    options.referer += ' --production';
  }
  options.referer += ' --uuid=' + uuid.v1();

  options.installRoot = options.pkgs.length === 0;

  options.progresses = {
    installTasks: 0,
    finishedInstallTasks: 0,
    linkTasks: 0,
    finishedLinkTasks: 0,
  };

  debug('options: %j', options);

  return options;
};
