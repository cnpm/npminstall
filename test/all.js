const path = require('node:path');
const spawn = require('node:child_process').spawn;
const npminstall = require('./npminstall');
const { rimraf } = require('../lib/utils');

const names = [
  'express',
  'koa',
  'browserify',
  'pm2',
  'grunt-cli',
  'npm',
  'karma',
  'bower',
  'coffee-script',
  'gulp',
  'forever',
  'grunt',
  'less',
  'yo',
  'lodash',
  'bluebird',
  'async',
  'commander',
  'q',
  'request',
  'debug',
  'mkdirp',
  'underscore',
  'chalk',
  'colors',
  'webpack',
  'antd',
  'cnpm',
  'pnpm',
  // 'firebase',
  'egg',
  // 'strongloop',
];

(async () => {
  const root = path.join(__dirname, 'fixtures', 'all');
  const pkgs = names.map(name => {
    if (typeof name === 'string') return { name };
    return name;
  });

  await rimraf(root);
  await npminstall({
    root,
    pkgs,
    detail: true,
  });

  const installer = spawn('sh', [ path.join(__dirname, 'git-clone-install.sh') ], {
    stdio: 'inherit',
  });
  installer.on('exit', code => process.exit(code));
})().catch(err => {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});
