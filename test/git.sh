#!/usr/bin/env sh

git clone https://github.com/chalk/chalk.git --depth=1
cd chalk
../bin/install.js
npm test || exit $?
cd ..
rm -rf chalk

git clone https://github.com/tj/co.git --depth=1
cd co
../bin/install.js
npm test || exit $?
cd ..
rm -rf co

git clone https://github.com/tj/commander.js.git --depth=1
cd commander.js
../bin/install.js
npm test || exit $?
cd ..
rm -rf commander.js

git clone https://github.com/substack/node-mkdirp.git --depth=1
cd node-mkdirp
../bin/install.js
npm test || exit $?
cd ..
rm -rf node-mkdirp

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

git clone https://github.com/expressjs/body-parser.git --depth=1
cd body-parser
../bin/install.js
npm test || exit $?
cd ..
rm -rf body-parser

git clone https://github.com/thunks/thunk-mocha.git --depth=1
cd thunk-mocha
../bin/install.js
npm test || exit $?
cd ..
rm -rf thunk-mocha

git clone https://github.com/mapbox/node-sqlite3.git --depth=1
cd node-sqlite3
../bin/install.js
npm test || exit $?
cd ..
rm -rf node-sqlite3

git clone https://github.com/cheeriojs/cheerio.git --depth=1
cd cheerio
../bin/install.js
npm test || exit $?
cd ..
rm -rf cheerio

git clone https://github.com/jprichardson/node-fs-extra.git --depth=1
cd node-fs-extra
../bin/install.js
npm test || exit $?
cd ..
rm -rf node-fs-extra

git clone https://github.com/winstonjs/winston.git --depth=1
cd winston
../bin/install.js
npm test || exit $?
cd ..
rm -rf winston

# wait for https://github.com/cnpm/npminstall/issues/11
# git clone https://github.com/facebook/react.git --depth=1
# cd react
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf react

git clone https://github.com/gulpjs/gulp.git --depth=1
cd gulp
../bin/install.js
npm test || exit $?
cd ..
rm -rf gulp

git clone https://github.com/etsy/statsd.git --depth=1
cd statsd
../bin/install.js
../bin/install.js nodeunit
npm test || exit $?
cd ..
rm -rf statsd

git clone https://github.com/less/less.js.git --depth=1
cd less.js
../bin/install.js
../bin/install.js grunt-cli
npm test || exit $?
cd ..
rm -rf less.js

git clone https://github.com/cnpm/npminstall.git --depth=1
cd npminstall
../bin/install.js
npm test || exit $?
cd ..
rm -rf npminstall

git clone https://github.com/pugjs/jade.git --depth=1
cd jade
../bin/install.js
npm test
cd ..
rm -rf jade

git clone https://github.com/webpack/webpack.git --depth=1
cd webpack
../bin/install.js
npm test
cd ..
rm -rf webpack

git clone https://github.com/request/request.git --depth=1
cd request
../bin/install.js
npm test
cd ..
rm -rf request

git clone https://github.com/karma-runner/karma.git --depth=1
cd karma
../bin/install.js
npm test
cd ..
rm -rf karma

git clone https://github.com/rstacruz/pnpm.git --depth=1
cd pnpm
../bin/install.js
npm test
cd ..
rm -rf pnpm

git clone https://github.com/eslint/eslint.git --depth=1
cd eslint
../bin/install.js
npm test
cd ..
rm -rf eslint

# git clone https://github.com/ant-design/ant-design.git --depth=1
# cd ant-design
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf ant-design

git clone https://github.com/substack/node-browserify.git --depth=1
cd node-browserify
../bin/install.js
npm test
cd ..
rm -rf node-browserify
