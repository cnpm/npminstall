
1.8.3 / 2016-05-24
==================

  * fix: don't touch cache file when use sudo (#83)

1.8.2 / 2016-05-10
==================

  * fix: utils.forceSymlink precheck dest dir exists (#82)

1.8.1 / 2016-05-08
==================

  * fix: anti os match bug (#81)

1.8.0 / 2016-05-08
==================

  * feat: support package.json#os property (#80)

1.7.0 / 2016-05-06
==================

  * feat: 打印出 deprecate 模块所在位置 (#78)

1.6.5 / 2016-05-04
==================

  * fix: add retry to get binary-mirror-config/latest (#77)
  * fix: install when bundle dependencies not exists (#76)

1.6.4 / 2016-04-28
==================

  * fix: add node-gyp (#75)

1.6.3 / 2016-04-14
==================

  * fix: get bianry mirror package (#71)

1.6.2 / 2016-04-13
==================

  * fix: trim string before json parse it (#70)

1.6.1 / 2016-04-05
==================

  * fix: chromedriver cdn url change

1.6.0 / 2016-04-01
==================

  * feat: add referer for registry access log

1.5.3 / 2016-03-30
==================

  * Fix install from git branch

1.5.2 / 2016-03-29
==================

  * fix: use correct name and version when installing from git

1.5.1 / 2016-03-29
==================

  * fix: sort pkg.dependencies

1.5.0 / 2016-03-28
==================

  * chore: fix eslint
  * chore: add ignore-scripts in readme
  * feat: support ignore-scripts

1.4.2 / 2016-03-26
==================

  * fix: fix global path on windows

1.4.1 / 2016-03-17
==================

  * Can install from a revision hash now.

1.4.0 / 2016-03-16
==================

  * feat: link root packages to storeDir/node_modules

1.3.2 / 2016-03-12
==================

  * fix: try to find the max satisfy version (n.x) in grandfather's deps

1.3.1 / 2016-03-09
==================

  * fix: fsevents use binary-mirror-config too

1.3.0 / 2016-03-09
==================

  * refactor: Get mirrors from https://github.com/cnpm/binary-mirror-config/blob/master/package.json#L43
  * feat: Auto set China mirror for prebuild binary packages

1.2.5 / 2016-03-07
==================

  * fix: add _from, _resolved back to package.json

1.2.4 / 2016-03-06
==================

  * fix: global install must reinstall the whole package

1.2.3 / 2016-03-05
==================

  * test: add test for global install
  * fix: install package@tag -g should work

1.2.2 / 2016-03-03
==================

  * fix: support shortcut install options

1.2.1 / 2016-03-03
==================

  * test: fix same tarball test case
  * fix: add prepublish script after postinstall
  * test: add pnpm benchmark scripts
  * feat: support npm_china env
  * feat: support read strict-ssl from npm config
  * chore: fix readme

1.2.0 / 2016-03-03
==================

  * feat: record post install scripts' cost
  * refactor: collect all post install scripts

1.1.1 / 2016-03-01
==================

  * fix: wait package install completed

1.1.0 / 2016-02-29
==================

  * feat: add --help
  * refactor: pass mirror env from bin, add --china options

1.0.8 / 2016-02-29
==================

  * fix: use registry.npmjs.com by default on bin/install.js

1.0.7 / 2016-02-27
==================

  * fix: --foo=bar should use `npm_config_` env prefix name

1.0.6 / 2016-02-27
==================

  * fix: ignore `Path` env on Windows
  * fix: auto set npm env just like npm cli does
  * chore: add support features

1.0.5 / 2016-02-26
==================

  * fix: cleanup before link, fixes #22

1.0.4 / 2016-02-25
==================

  * fix: separate installed and existed

1.0.3 / 2016-02-25
==================

  * chore: add different with npm
  * test: add npm_registry env for ci
  * feat(bin): support --save, --save-dev and --save-optional

1.0.2 / 2016-02-24
==================

  * feat: support link to specific binDir
  * fix: use options.cache
  * fix: local module relative path
  * fix: try nodeModulePaths to find peerDependencies
  * chore: add install to specific directory in readme
  * feat: support install to target dir

1.0.1 / 2016-02-23
==================

  * refactor: change store structure

1.0.0 / 2016-02-21
==================

  * test: add link again test
  * refactor: try install from https git url first
  * test: use full path of _mocha
  * test: travis install git
  * fix: fix review bugs
  * chore: lint
  * fix: download pacakge count
  * fix: skip link test in win32
  * feat: support git and hosted
  * feat: support remote pacakges
  * fix: uniq by version
  * test: add missing folder
  * test: add assert message
  * test: fix test case description
  * feat: support install from local folder or tallbars
  * feat: add total json count
  * doc: add verbose benchmark histroy
  * refactor: download npm

0.7.0 / 2016-02-18
==================

  * feat: cache by range max bound

0.6.0 / 2016-02-17
==================

  * test: fix mock download error tests
  * benchmark: add npminstall with cache
  * test: download from orginal cdn on travis ci env
  * feat: add local cache dir to store tarball files

0.5.1 / 2016-02-16
==================

  * fix: make sure link latest version parent dir exists
  * feat: support process.env.NODE_ENV and add --version command
  * fix: only remove done file when install error

0.5.0 / 2016-02-15
==================

  * feat: add download packages count
  * refactor: add OPERADRIVER_CDNURL env
  * feat: add download speed

0.4.0 / 2016-02-14
==================

  * refactor: link latest version to .npminstall/node_modules
  * test: add more projects to test/git.sh
  * test: add relink exists file test case
  * fix: optionalDependencies typo
  * fix: relink exists link file should work
  * fix: ignore hosted type package
  * fix: ignore cleanup error
  * test: add more project test case
  * feat: link every module latest version to root node_modules

0.3.0 / 2016-02-08
==================

  * fix: add retry when GET request throw ECONNRESET error
  * feat: add peerDependencies validate

0.2.0 / 2016-02-06
==================

  * test: add codecov for appveyor
  * fix: use cmd-shim for Windows linkBin
  * test: add more packages on test/all.js
  * feat: runScript support Windows
  * test: add appveyor ci
  * refactor: tzgfile do not store on dist

0.1.0 / 2016-02-04
==================

  * feat: bin/install.js support --production flag
  * fix: bundledDependencies also can spelled as "bundleDependencies"
  * feat: support production mode
  * feat: cleanup when install failed
  * feat: support optional dependencies
  * refactor: install
  * deps: mkdirp
  * fix: fix event memory leak warning
  * feat: display depracated infomation
  * feat: support name@spec
  * fix: link bundledependencies' bin
  * chore: use mz/fs only
  * deps: use mkdirp
  * fix: fix log time
  * refactor: use co-parallel, add benchmark
  * fix: default store dir in node_modules

0.0.4 / 2016-02-03
==================

 * fix: co should be dependencies
