
cnpmjs.org:
	@echo -------npminstall-------
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm_registry=http://registry.npm.taobao.org ../../bin/install.js
	@echo ---------pnpm-----------
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time env npm_registry=http://registry.npm.taobao.org pnpm install
	@echo ----------npm-----------
	@cd cnpmjs.org && rm -rf node_modules
	@npm cache clean
	@cd cnpmjs.org && time npm install --registry=http://registry.npm.taobao.org
	@echo ----npm with cache------
	@cd cnpmjs.org && rm -rf node_modules
	@cd cnpmjs.org && time npm install --registry=http://registry.npm.taobao.org

.PHONY: cnpmjs.org
