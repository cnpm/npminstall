'use strict';

const path = require('path');
const rimraf = require('rimraf');
const semver = require('semver');
const spawn = require('child_process').spawn;
const npminstall = require('./npminstall');

if (semver.satisfies(process.version, '< 6.0.0')) {
  process.exit(0);
}

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
  'firebase',
];

const semvers = {
  '>= 6': [
    'egg',
  ],
  '<= 8': [
    'strongloop',
  ],
};

for (const version in semvers) {
  if (!semver.satisfies(process.version, version)) continue;
  const pkgs = semvers[version];
  for (const pkg of pkgs) names.push(pkg);
}

(async () => {
  const root = path.join(__dirname, 'fixtures', 'all');
  const pkgs = names.map(name => {
    if (typeof name === 'string') return { name };
    return name;
  });

  rimraf.sync(root);
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
