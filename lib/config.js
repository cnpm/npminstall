'use strict';

const config = {
  env: {
    // show node-pre-gyp http info
    // like "node-pre-gyp http GET https://npm.taobao.org/mirrors/fsevents/v1.0.6/fse-v1.0.6-node-v46-darwin-x64.tar.gz"
    npm_config_loglevel: 'http',
  },
  chineseMirrorEnv: {
    NODEJS_ORG_MIRROR: 'https://npm.taobao.org/mirrors/node',
    NVM_NODEJS_ORG_MIRROR: 'https://npm.taobao.org/mirrors/node',
    NVM_IOJS_ORG_MIRROR: 'https://npm.taobao.org/mirrors/iojs',
    PHANTOMJS_CDNURL: 'https://npm.taobao.org/mirrors/phantomjs',
    CHROMEDRIVER_CDNURL: 'http://tnpm-hz.oss-cn-hangzhou.aliyuncs.com/dist/chromedriver',
    OPERADRIVER_CDNURL: 'https://npm.taobao.org/mirrors/operadriver',
    ELECTRON_MIRROR: 'https://npm.taobao.org/mirrors/electron/',
    SASS_BINARY_SITE: 'https://npm.taobao.org/mirrors/node-sass',
    FLOW_BINARY_MIRROR: 'https://github.com/facebook/flow/releases/download/v',
  },
  chineseRegistry: 'https://registry.npm.taobao.org',
};

module.exports = config;
