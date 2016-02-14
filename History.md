
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
