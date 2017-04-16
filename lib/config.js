'use strict';

const config = {
  env: {
    // show node-pre-gyp http info
    // like "node-pre-gyp http GET https://npm.taobao.org/mirrors/fsevents/v1.0.6/fse-v1.0.6-node-v46-darwin-x64.tar.gz"
    npm_config_loglevel: 'http',
  },
  chineseMirrorUrl: 'https://npm.taobao.org/mirrors',
  chineseRegistry: 'https://registry.npm.taobao.org',
};

module.exports = config;
