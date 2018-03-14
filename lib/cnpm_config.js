'use strict';
const path = require('path');
const fs = require('fs');
const config = {};

function createConfigs() {
  let root;
  if (process.platform === 'win32') {
    root = process.env.USERPROFILE || process.env.APPDATA || process.env.TMP || process.env.TEMP;
  } else {
    root = process.env.HOME || process.env.TMPDIR || '/tmp';
  }
  let userConfig = path.join(root, '.cnpmrc');
  if (!fs.existsSync(userConfig)) return;
  let userConfigContent = fs.readFileSync(userConfig).toString();
  let configs = typeof userConfigContent === 'string' && userConfigContent.split('\n');
  configs.reduce((pre, next) => {
    if (typeof next === 'string') {
      let map = next.split('=');
      let key = map[0];
      let value = map[1];
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      pre[key] = value;
    }
    return pre;
  }, config);

}

createConfigs();

module.exports = {
  get(key) {
    return config[key];
  }
}