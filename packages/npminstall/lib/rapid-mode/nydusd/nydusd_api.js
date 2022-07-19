'use strict';

const urllib = require('urllib');
const debug = require('debug')('npminstall:rapid:nydusd_api');
const crossSpawn = require('cross-spawn');
const runscript = require('runscript');
const awaitEvent = require('await-event');
const { mkdirp, sleep } = require('../../utils');

const {
  nydusd,
  nydusdConfigFile,
  nydusdMnt,
  nydusdLogFile,
  socketPath,
  tarBucketsDir,
} = require('../constants');
const { wrapSudo, getWorkdir } = require('../util');

// see all APIs at: https://github.com/dragonflyoss/image-service/blob/master/api/openapi/nydus-rs.yaml
const endpoint = 'http://unix/api/v1';
const mountUrl = `${endpoint}/mount`;
const daemonUrl = `${endpoint}/daemon`;

const nydusdConfig = JSON.stringify({
  device: {
    backend: {
      type: 'localfs',
      config: {
        dir: tarBucketsDir,
        readahead: true,
      },
    },
  },
  mode: 'direct',
  digest_validate: false, // skip entry shasum check
  iostats_files: false, // skip profile file generation
});

async function isDaemonRunning() {
  try {
    const result = await urllib.request(`${daemonUrl}`, {
      method: 'GET',
      socketPath,
    });
    return result.status === 200;
  } catch (_) {
    return false;
  }
}

// 启动 nydusd daemon
async function initDaemon(nydusdBin = '') {
  const isRunning = await isDaemonRunning();
  // 已经启动了，直接返回
  if (isRunning) {
    console.info('[npminstall] nydusd daemon is running already.');
    return;
  }

  console.time('[npminstall] start nydusd daemon');
  await mkdirp(nydusdMnt);
  let subprocess;
  if (process.platform === 'linux') {
    subprocess = crossSpawn('sudo', [
      nydusdBin || nydusd,
      '--config', nydusdConfigFile,
      '--mountpoint', nydusdMnt,
      '--apisock', socketPath,
      '--log-file', nydusdLogFile,
    ], {
      detached: true,
      stdio: [ 'ignore', 'pipe', 'pipe' ],
    });
  } else {
    subprocess = crossSpawn(nydusdBin || nydusd, [
      '--config', nydusdConfigFile,
      '--mountpoint', nydusdMnt,
      '--apisock', socketPath,
      '--log-file', nydusdLogFile,
    ], {
      detached: true,
      stdio: [ 'ignore', 'pipe', 'pipe' ],
    });
  }

  subprocess.unref();
  console.info('[npminstall] startNydusd: %j', subprocess.spawnargs.join(' '));

  const signalCode = await Promise.race([
    awaitEvent(subprocess, 'exit'),
    checkDaemon(),
  ]);

  if (signalCode === 1) {
    throw new Error('nydusd daemon start failed');
  }
  console.timeEnd('[npminstall] start nydusd daemon');
}

async function checkDaemon() {
  // 最多等 3 秒
  const maxWaitDuration = 3000;
  const startTime = Date.now();
  let signalCode = 1;
  while (signalCode === 1) {
    try {
      const result = await urllib.request(`${daemonUrl}`, {
        method: 'GET',
        socketPath,
      });
      if (result.status === 200) {
        signalCode = 0;
        break;
      }
    } catch (error) {
      console.info('[npminstall] mount nydusd is not ready, waiting...');
      debug('mount error: ', error);
      // linux 下需要用 sudo 启动，如果没有权限，这里
      if (error.code === 'EACCES' && process.platform === 'linux') {
        await runscript(wrapSudo(`chmod 777 ${socketPath}`));
      }
      if (Date.now() - startTime <= maxWaitDuration) {
        await sleep(100);
      } else {
        throw error;
      }
    }
  }

  return signalCode;
}

// 优雅退出 nydusd daemon
async function exitDaemon() {
  try {
    await urllib.request(`${daemonUrl}/exit`, {
      method: 'PUT',
      socketPath,
      dataType: 'json',
    });
  } catch (_) {
    // ignore, nydusd quits with error, but it's ok
  }
}

async function mount(mountpoint, cwd, bootstrap = '') {
  const workDir = await getWorkdir(cwd);
  const result = await urllib.request(`${mountUrl}?mountpoint=${mountpoint}`, {
    method: 'POST',
    socketPath,
    data: {
      source: bootstrap || workDir.bootstrap,
      fs_type: 'rafs',
      config: nydusdConfig,
    },
    contentType: 'json',
    dataType: 'json',
  });
  debug('mount result: %j', result);
}

// 重新配置挂载点
async function remount(mountpoint, cwd, bootstrap = '') {
  const workDir = await getWorkdir(cwd);
  const result = await urllib.request(`${mountUrl}?mountpoint=${mountpoint}`, {
    method: 'PUT',
    socketPath,
    data: {
      source: bootstrap || workDir.bootstrap,
      fs_type: 'rafs',
      config: nydusdConfig,
    },
    dataType: 'json',
    contentType: 'json',
  });
  debug('remount result: %j', result);
}

// 卸载挂载点
async function umount(mountpoint) {
  const result = await urllib.request(`${mountUrl}?mountpoint=${mountpoint}`, {
    method: 'DELETE',
    socketPath,
  });
  debug('umount result: %j', result);
}

exports.mount = mount;
exports.remount = remount;
exports.umount = umount;
exports.initDaemon = initDaemon;
exports.exitDaemon = exitDaemon;
