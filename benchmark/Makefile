
cnpmjs.org:
	@echo ------- npminstall@`../bin/install.js -v` -------
	@cd cnpmjs.org && rm -rf node_modules ~/.npminstall_tarball
	@cd cnpmjs.org && time npm_registry=https://registry.npm.taobao.org ../../bin/install.js
	@echo ------- npminstall@`../bin/install.js -v` with cache -------
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm_registry=https://registry.npm.taobao.org ../../bin/install.js
	@echo ------- npminstall@`../bin/install.js -v` --no-cache -------
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm_registry=https://registry.npm.taobao.org ../../bin/install.js --no-cache
	@echo --------- pnpm@`pnpm -v` -----------
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm_registry=https://registry.npm.taobao.org pnpm install
	@echo ---------- npm@`npm -v` -----------
	@cd cnpmjs.org && rm -rf node_modules
	@npm cache clean
	@cd cnpmjs.org && time npm install --registry=https://registry.npm.taobao.org
	@echo ---- npm@`npm -v` with cache ------
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm install --registry=https://registry.npm.taobao.org

pnpm:
	# see https://github.com/rstacruz/pnpm#benchmark
	@echo "npminstall babel-preset-es2015 browserify chalk debug minimist mkdirp"
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time ../../bin/install.js -c babel-preset-es2015 browserify chalk debug minimist mkdirp
	@echo "pnpm i babel-preset-es2015 browserify chalk debug minimist mkdirp"
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm_registry=https://registry.npm.taobao.org pnpm i babel-preset-es2015 browserify chalk debug minimist mkdirp
	@echo "npm i babel-preset-es2015 browserify chalk debug minimist mkdirp"
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm i babel-preset-es2015 browserify chalk debug minimist mkdirp --registry=https://registry.npm.taobao.org

.PHONY: cnpmjs.org
