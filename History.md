
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
