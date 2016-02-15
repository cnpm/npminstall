#!/usr/bin/env sh

git clone https://github.com/chalk/chalk.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/tj/co.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/tj/commander.js.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/substack/node-mkdirp.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/expressjs/express.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/toajs/toa.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/hapijs/hapi.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/cnpm/cnpmjs.org.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

# git clone https://github.com/strongloop/loopback.git --depth=1 .tmp
# cd .tmp
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf .tmp

git clone https://github.com/koajs/koa.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/expressjs/body-parser.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/thunks/thunk-mocha.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/mapbox/node-sqlite3.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/cheeriojs/cheerio.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/jprichardson/node-fs-extra.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/winstonjs/winston.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

# wait for https://github.com/cnpm/npminstall/issues/11
# git clone https://github.com/facebook/react.git --depth=1 .tmp
# cd .tmp
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf .tmp

git clone https://github.com/gulpjs/gulp.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/etsy/statsd.git --depth=1 .tmp
cd .tmp
../bin/install.js
../bin/install.js nodeunit
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/less/less.js.git --depth=1 .tmp
cd .tmp
../bin/install.js
../bin/install.js grunt-cli
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/socketio/socket.io.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/bcoe/yargs.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/yeoman/yosay.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/npm/node-semver.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/isaacs/rimraf.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/mishoo/UglifyJS2.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/stream-utils/destroy.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/mafintosh/electron-prebuilt.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/visionmedia/superagent.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/mochajs/mocha.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/broofa/node-mime.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/Leonidas-from-XIV/node-xml2js.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/mde/ejs.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/nodeca/js-yaml.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/dominictarr/through.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/chjj/marked.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/senchalabs/connect.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/expressjs/cookie-parser.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/maxogden/concat-stream.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/ljharb/qs.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

# git clone https://github.com/facebook/immutable-js.git --depth=1 .tmp
# cd .tmp
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf .tmp

# git clone https://github.com/babel/babel.git --depth=1 .tmp
# cd .tmp
# ../bin/install.js
# make test || exit $?
# cd ..
# rm -rf .tmp

# git clone https://github.com/wycats/handlebars.js.git --depth=1 .tmp
# cd .tmp
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf .tmp

# git clone https://github.com/NodeRedis/node_redis.git --depth=1 .tmp
# cd .tmp
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf .tmp

git clone https://github.com/cnpm/npminstall.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test || exit $?
cd ..
rm -rf .tmp

git clone https://github.com/pugjs/jade.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp

git clone https://github.com/webpack/webpack.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp

git clone https://github.com/request/request.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp

git clone https://github.com/karma-runner/karma.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp

git clone https://github.com/rstacruz/pnpm.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp

git clone https://github.com/eslint/eslint.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp

# git clone https://github.com/ant-design/ant-design.git --depth=1 .tmp
# cd .tmp
# ../bin/install.js
# npm test || exit $?
# cd ..
# rm -rf .tmp

git clone https://github.com/substack/node-browserify.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp

git clone https://github.com/chaijs/chai.git --depth=1 .tmp
cd .tmp
../bin/install.js
npm test
cd ..
rm -rf .tmp
