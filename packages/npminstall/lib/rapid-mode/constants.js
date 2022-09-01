'use strict';

const path = require('path');
const os = require('os');

const homedir = os.homedir();
const platform = process.platform;
const arch = process.arch;
let rsBindingPath;
try {
  rsBindingPath = path.dirname(require.resolve(`@cnpmjs/binding-${platform}-${arch}`, {
    paths: [
      require.resolve('@cnpmjs/binding'),
    ],
  }));
} catch (_) {
  // ...
}

// 服务端生成依赖树判断项目当前运行环境枚举
const NODE_ENV_ENUMS = {
  PROD: 'prod', // prodoction
  ALL: 'all', // development
};

const baseRapidModeDir = path.join(homedir, '.npminstall', 'rapid-mode');
// 依赖 tar 文件目录
const tarBucketsDir = path.join(baseRapidModeDir, 'tar_buckets');

// nydusd fuse 挂载全部依赖目录
const nydusdMnt = path.join(baseRapidModeDir, 'mnt');

// npm 包本地缓存信息
const npmCacheConfigPath = path.join(tarBucketsDir, 'npm.config.json');

// nydusd 可执行文件，支持 x64 和 arm64 架构的 Linux/macOS
const nydusd = rsBindingPath
  ? path.join(rsBindingPath, 'nydusd')
  : undefined;

// unionfs-fuse 可执行文件，支持 x64 和 arm64 架构的 macOS
// see doc/DEVELOPER.md
const unionfs = rsBindingPath
  ? path.join(rsBindingPath, 'unionfs')
  : undefined;

// nydusd 配置文件
const nydusdConfigFile = path.join(baseRapidModeDir, './nydus-config.json');
// nydusd API socket
const socketPath = path.join(baseRapidModeDir, 'nydusd.sock');
// nydusd log file
const nydusdLogFile = path.join(baseRapidModeDir, 'nydusd.log');

// nydusd 构造 inode bootstrap 文件
const nydusdBootstrapFile = 'nydusd-bootstrap';

const TNPM_NYDUS_TYPE = 'TNPM_NYDUS_TYPE';
const BOOTSTRAP_BIN = rsBindingPath
  ? path.join(rsBindingPath, 'nydusd-bootstrap')
  : undefined;

exports.baseRapidModeDir = baseRapidModeDir;
exports.nydusdConfigFile = nydusdConfigFile;
exports.NODE_ENV_ENUMS = NODE_ENV_ENUMS;
exports.tarBucketsDir = tarBucketsDir;
exports.npmCacheConfigPath = npmCacheConfigPath;
exports.socketPath = socketPath;
exports.nydusdMnt = nydusdMnt;
exports.nydusdBootstrapFile = nydusdBootstrapFile;
exports.nydusd = nydusd;
exports.unionfs = unionfs;
exports.nydusdLogFile = nydusdLogFile;
exports.BOOTSTRAP_BIN = BOOTSTRAP_BIN;
exports.NYDUS_TYPE = {
  FUSE: 'FUSE',
  NONE: 'NONE',
};
exports.TNPM_NYDUS_TYPE = TNPM_NYDUS_TYPE;
