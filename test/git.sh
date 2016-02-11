#!/usr/bin/env sh

git clone https://github.com/expressjs/express.git --depth=1
cd express
../bin/install.js
npm test || exit $?
cd ..
rm -rf express

git clone https://github.com/koajs/koa.git --depth=1
cd koa
../bin/install.js
npm test || exit $?
cd ..
rm -rf koa

git clone https://github.com/thunks/thunk-mocha.git --depth=1
cd thunk-mocha
../bin/install.js
npm test || exit $?
cd ..
rm -rf thunk-mocha

git clone https://github.com/ant-design/ant-design.git --depth=1
cd ant-design
../bin/install.js
npm test || exit $?
cd ..
rm -rf ant-design

git clone https://github.com/substack/node-browserify.git --depth=1
cd node-browserify
../bin/install.js
npm test || exit $?
cd ..
rm -rf node-browserify

git clone https://github.com/gulpjs/gulp.git --depth=1
cd gulp
../bin/install.js
npm test || exit $?
cd ..
rm -rf gulp

git clone https://github.com/etsy/statsd.git --depth=1
cd statsd
../bin/install.js
npm test || exit $?
cd ..
rm -rf statsd

git clone https://github.com/less/less.js.git --depth=1
cd less.js
../bin/install.js
npm test || exit $?
cd ..
rm -rf less.js

git clone https://github.com/webpack/webpack.git --depth=1
cd webpack
../bin/install.js
npm test
cd ..
rm -rf webpack

git clone https://github.com/cnpm/npminstall.git --depth=1
cd npminstall
../bin/install.js
npm test || exit $?
cd ..
rm -rf npminstall

git clone https://github.com/rstacruz/pnpm.git --depth=1
cd pnpm
../bin/install.js
npm test || exit $?
cd ..
rm -rf pnpm
