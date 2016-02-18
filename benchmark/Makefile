
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

.PHONY: cnpmjs.org
