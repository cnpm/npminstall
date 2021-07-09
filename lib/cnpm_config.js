'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = {};

function createConfigs() {
  let root;
  if (process.platform === 'win32') {
    root = process.env.USERPROFILE || process.env.APPDATA || process.env.TMP || process.env.TEMP;
  } else {
    root = process.env.HOME || process.env.TMPDIR || '/tmp';
  }
  const userConfig = path.join(root, '.cnpmrc');
  if (!fs.existsSync(userConfig)) return;
  const userConfigContent = fs.readFileSync(userConfig).toString();
  const configs = typeof userConfigContent === 'string' && userConfigContent.split(os.EOL);
  configs.reduce((pre, next) => {
    if (typeof next === 'string') {
      const map = next.split('=');
      const key = map[0];
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
  },
};
