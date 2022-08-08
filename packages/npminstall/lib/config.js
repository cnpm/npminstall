'use strict';

const pkg = require('../package.json');

const config = {
  env: {
    // show node-pre-gyp http info
    // like "node-pre-gyp http GET https://npmmirror.com/mirrors/fsevents/v1.0.6/fse-v1.0.6-node-v46-darwin-x64.tar.gz"
    npm_config_loglevel: 'http',
  },
  chineseMirrorUrl: 'https://npmmirror.com/mirrors',
  chineseRegistry: 'https://registry.npmmirror.com',
  userAgent: `npminstall/${pkg.version} npm/? node/${process.version} ${process.platform} ${process.arch}`,
};

module.exports = config;
