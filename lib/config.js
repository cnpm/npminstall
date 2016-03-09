/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const config = {
  env: {
    // show node-pre-gyp http info
    // like "node-pre-gyp http GET https://npm.taobao.org/mirrors/fsevents/v1.0.6/fse-v1.0.6-node-v46-darwin-x64.tar.gz"
    npm_config_loglevel: 'http',
  },
  chineseMirrorEnv: {
    NVM_NODEJS_ORG_MIRROR: 'https://npm.taobao.org/mirrors/node',
    NVM_IOJS_ORG_MIRROR: 'https://npm.taobao.org/mirrors/iojs',
    PHANTOMJS_CDNURL: 'https://npm.taobao.org/mirrors/phantomjs',
    CHROMEDRIVER_CDNURL: 'http://oss.npm.taobao.org/dist/chromedriver',
    OPERADRIVER_CDNURL: 'https://npm.taobao.org/mirrors/operadriver',
    ELECTRON_MIRROR: 'https://npm.taobao.org/mirrors/electron/',
    SASS_BINARY_SITE: 'https://npm.taobao.org/mirrors/node-sass',
  },
  chineseRegistry: 'https://registry.npm.taobao.org',
};

module.exports = config;
