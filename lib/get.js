'use strict';

const debug = require('debug')('npminstall:get');
const urllib = require('urllib');
const destroy = require('destroy');
const CacheableLookup = require('cacheable-lookup');
const utils = require('./utils');
const cnpmConfig = require('./cnpm_config');
const urlParser = require('url');

module.exports = get;

const USER_AGENT = 'npminstall/' + require('../package.json').version + ' ' + urllib.USER_AGENT;
const MAX_RETRY = 5;
const cacheable = new CacheableLookup();

async function get(url, options, globalOptions) {
  options.headers = options.headers || {};
  options.headers['User-Agent'] = USER_AGENT;
  if (globalOptions) {
    options.rejectUnauthorized = globalOptions.strictSSL;
    if (globalOptions.referer) {
      options.headers.Referer = globalOptions.referer;
    }
    if (globalOptions.proxy) {
      options.enableProxy = true;
      options.proxy = globalOptions.proxy;
      debug('enableProxy: %s', options.proxy);
    }
  }
  // need auth
  const registryUrl = cnpmConfig.get('registry');
  const registryUri = registryUrl && registryUrl.replace(urlParser.parse(registryUrl).protocol, '') || '';
  const authed = registryUri && url.indexOf(registryUri) !== -1;
  const hasUserSettings = typeof cnpmConfig.get(registryUri + ':username') === 'string' && typeof cnpmConfig.get(registryUri + ':_password') === 'string';
  if (hasUserSettings && (authed || cnpmConfig.get(registryUri + ':always-auth') || cnpmConfig.get('always-auth'))) {
    const authToken = (`${cnpmConfig.get(registryUri + ':username')}:${Buffer.from(cnpmConfig.get(registryUri + ':_password'), 'base64').toString()}`);
    options.headers.Authorization = `Basic ${Buffer.from(authToken).toString('base64')}`;
  }
  const retry = options.retry || options.retry === 0 ? options.retry : MAX_RETRY;
  options.retry = undefined;
  debug('GET %s with headers: %j', url, options.headers);
  options.lookup = cacheable.lookup;
  const result = await _get(url, options, retry, globalOptions);
  debug('Response %s, headers: %j', result.status, result.headers);
  if (result.status < 100 || result.status >= 400) {
    if (options.streaming) {
      try {
        destroy(result.res);
      } catch (err) {
        const logger = globalOptions && globalOptions.console || console;
        logger.warn('[npminstall:get] ignore destroy response stream error: %s', err);
      }
    }
    let message = `GET ${url} response ${result.status} status`;
    if (result.headers && result.headers['npm-notice']) {
      message += `, ${result.headers['npm-notice']}`;
    }
    const err = new Error(message);
    err.status = result.status;
    throw err;
  }
  return result;
}

async function _get(url, options, retry, globalOptions) {
  try {
    return await urllib.request(url, options);
  } catch (err) {
    retry--;
    if (retry > 0) {
      const delay = 100 * (MAX_RETRY - retry);
      const logger = globalOptions && globalOptions.console || console;
      logger.warn('[npminstall:get] retry GET %s after %sms, retry left %s, %s: %s, status: %s, headers: %j',
        url, delay, retry, err.name, err.message, err.status, err.headers);
      await utils.sleep(delay);
      return await _get(url, options, retry, globalOptions);
    }

    throw err;
  }
}
