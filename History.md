
3.1.1 / 2017-08-02
==================

  * fix: add proxy options on getBinaryMirrors (#243)

3.1.0 / 2017-08-01
==================

  * feat: support --proxy (#242)

3.0.1 / 2017-06-08
==================

  * fix: warning when package name unmatch from git (#238)

3.0.0 / 2017-06-05
==================

  * test: ignore node-gyp.test.js on win32
  * fix: set accept application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*
  * test: add test on node 8
  * fix: merge local package.json file to realPkg
  * feat: [BREAKING_CHANGE] less json requests, more faster

2.30.1 / 2017-05-23
==================

  * chore: rename await (#234)
  * fix: package.json to reduce vulnerabilities (#232)

2.30.0 / 2017-05-09
==================

  * feat: enable disk cache strict event on production env (#230)
  * feat: recently update display latest version (#228)

2.29.2 / 2017-04-27
==================

  * fix: remove starting dot to ensure webpack2 work (#227)

2.29.1 / 2017-03-29
==================

  * fix: store path starts with `_{name}` (#223)

2.29.0 / 2017-03-29
==================

  * feat: support mirror github.com in pngquant-bin (#222)

2.28.0 / 2017-03-28
==================

  * feat: store path starts with name (#220)

2.27.1 / 2017-03-28
==================

  * fix: emit download cache await event if donefile exists (#219)

2.27.0 / 2017-03-27
==================

  * feat: record all installed packages' versions
  * refactor: split install function into pieces
  * fix: should continue install when optional dep error (#217)

2.26.4 / 2017-03-08
==================

  * fix: use readJSON instead of require (#214)
  * test: remove ghost install test (#213)

2.26.3 / 2017-03-08
==================

  * fix: ensure peer dependencies flatten (#212)

2.26.2 / 2017-02-27
==================

  * fix: peer dependency duplicated with dependency (#209)

2.26.1 / 2017-02-27
==================

  * fix: use ancestor spec instead of undefined (#208)

2.26.0 / 2017-02-25
==================

  * feat: improve peerDependencies' lookup (#207)
  * feat: typescript definitions always flatten (#206)

2.25.0 / 2017-02-24
==================

  * feat: only allow install from registry by a new flag (#203)

2.24.1 / 2017-02-23
==================

  * fix: support fsevents mirror (#201)

2.24.0 / 2017-02-13
==================

  * feat: support link pkg@spec (#199)

2.23.0 / 2017-02-13
==================

  * feat: n.x and n.m.x always use flatten (#200)

2.22.1 / 2017-02-10
==================

  * fix: use ancestor's dependence even version not change (#198)

2.22.0 / 2017-02-09
==================

  * feat: lookup ancestor's dependencies (#197)

2.21.0 / 2017-02-07
==================

  * feat: support engines.node version checker (#195)

2.20.0 / 2017-02-04
==================

  * feat: enable cpu and memory usage traces by --trace (#194)

2.19.2 / 2017-02-03
==================

  * fix: get max satisfy version from root dependencies instead of * (#193)

2.19.1 / 2017-02-03
==================

  * fix: dont show debug log when no bin to link
  * fix: should limit sub package install parallel

2.19.0 / 2017-02-03
==================

  * test: ignore stdout assert on custom mirror
  * fix: should stop spinner when install fail
  * feat: support parallel execution

2.18.2 / 2017-01-26
==================

  * fix: auto fix invaild tgz file (#189)

2.18.1 / 2017-01-25
==================

  * fix: should not enable ora when detail enable (#187)

2.18.0 / 2017-01-25
==================

  * feat: add install and link tasks progresses (#186)

2.17.0 / 2017-01-25
==================

  * feat: add .npminstall.done file on node_modules after install success (#185)

2.16.1 / 2017-01-18
==================

  * fix: update cli should ignore package names args (#182)

2.16.0 / 2016-12-26
==================

  * test: ci tgz download from orginal npm registry
  * fix: keep npm_rootpath exits on link cmd
  * test: use registry env
  * fix: don't retry to get mirror latest package
  * deps: upgrade agentkeepalive to 3.0.0 (#177)

2.15.0 / 2016-12-14
==================

  * feat: more debug info (#175)

2.14.0 / 2016-12-14
==================

  * feat: should get with retry on all error scene (#174)

2.13.3 / 2016-11-30
==================

  * fix: support `npmlink` => `npm link` to global (#172)

2.13.2 / 2016-11-23
==================

  * chore(package): update uuid to version 3.0.0 (#170)

2.13.1 / 2016-11-23
==================

  * fix: convert ~ to HOME

2.13.0 / 2016-11-22
==================

  * feat: support `$ npmlink <folder>` (#169)

2.12.2 / 2016-11-21
==================

  * fix: install --save from folder should use real pkg info (#168)

2.12.1 / 2016-11-18
==================

  * refactor: global install root dir don't use link (#167)

2.12.0 / 2016-11-15
==================

  * fix: should force set detail on production mode (#165)

2.11.2 / 2016-11-04
==================

  * feat: display the entire dependencies path when download error
  * fix: install package from git/remote/hosted with save options

2.11.1 / 2016-11-03
==================

  * fix: auto set npm_config_cache = cacheDir (#161)

2.11.0 / 2016-11-03
==================

  * feat: add npm_rootpath to env (#160)
  * refactor: use ENVS from binary-mirror-config (#158)

2.10.0 / 2016-10-27
==================

  * test: add node v7
  * feat: support raw.github.com mirror

2.9.5 / 2016-10-25
==================

  * fix: limit max 10 sockets per host (#153)

2.9.4 / 2016-10-22
==================

  * refactor: better log interface (#150)

2.9.3 / 2016-10-22
==================

  * fix: peerDependencies warning (#149)

2.9.2 / 2016-10-19
==================

  * feat: show ancestors version (#147)

2.9.1 / 2016-10-19
==================

  * fix: global prefix support `~/foo/path` (#146)

2.9.0 / 2016-10-19
==================

  * feat: better log (#142)

2.8.0 / 2016-10-17
==================

  * feat: list recently update packages (#144)
  * fix: should retry on http response timeout (#143)

2.7.0 / 2016-10-12
==================

  * feat: keep relation (#138)

2.6.0 / 2016-10-12
==================

  * feat: support npm update feat (#133)

2.5.0 / 2016-10-12
==================

  * feat: show deprecate message after install step (#134)

2.4.1 / 2016-09-22
==================

  * fix: support uninstall -g (#130)

2.4.0 / 2016-09-20
==================

  * feat: use npminstall instead of npm install on runscript (#129)

2.3.1 / 2016-09-19
==================

  * fix: binary mirror could be http protocol (#128)

2.3.0 / 2016-09-19
==================

  * feat: support --tarball-url-mapping=json-string (#127)

2.2.4 / 2016-09-18
==================

  * fix: add missing npm_config_argv env (#126)

2.2.3 / 2016-09-18
==================

  * fix: globalOptions.console undefined (#125)

2.2.2 / 2016-09-13
==================

  * fix: don't run prepublish on production mode (#123)

2.2.1 / 2016-09-08
==================

  * fix: fix package.json permission (#120)

2.2.0 / 2016-09-08
==================

  * fix: retry get if registry return 50x (#119)
  * fix: npm registry scoped permission error (#118)
  * fix: use normalize-git-url to parse git url (#117)
  * feat: auto set `npm_package_*` env on run script (#116)

2.1.1 / 2016-09-01
==================

  * fix: auto add EOL on --save (#114)

2.1.0 / 2016-08-24
==================

  * feat: should follow npm install version (#111)
  * test: ignore eslint-plugin-html.test.js on windows

2.0.2 / 2016-08-03
==================

  * fix: store dir name should ends with name (#106)
  * Release 2.0.1

2.0.1 / 2016-08-02
==================

  * fix: improve install error message tips (#105)

2.0.0 / 2016-07-28
==================

  * fix: add node-gyp-bin to package.json files
  * fix: ensure always can find node-gyp (#103)
  * feat: support custom china mirror url (#101)
  * fix: global storeDir must ends with `node_modules` (#99)
  * refactor: remove .npminstall (#98)

1.14.0 / 2016-07-17
==================

  * chore: adapte eslint-config-egg@3 (#96)
  * feat: support uninstall (#95)

1.13.0 / 2016-07-04
==================

  * feat: fetch from regsitry when not install from package.json (#94)

1.12.1 / 2016-06-28
==================

  * fix: remove done file when install failed (#92)

1.12.0 / 2016-06-26
==================

  * fix: add npm_execpath env in pre/post install script (#91)
  * feat: support flow-bin mirror (#87)

1.11.1 / 2016-06-26
==================

  * fix: forbidden licenses just show tips (#89)

1.11.0 / 2016-06-23
==================

  * feat: support forbidden-license (#88)

1.10.1 / 2016-05-25
==================

  * fix: remove console.error (#86)

1.10.0 / 2016-05-25
==================

  * feat: support global install prefix argv (#85)

1.9.0 / 2016-05-25
==================

  * feat: retry 3 times on shasum not match and 50x error (#84)

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
