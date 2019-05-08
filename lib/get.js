'use strict';

const debug = require('debug')('npminstall:get');
const urllib = require('urllib');
const destroy = require('destroy');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const utils = require('./utils');
const cnpmConfig = require('./cnpm_config');
const urlParser = require('url');

module.exports = get;

const httpKeepaliveAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 10,
});
const httpsKeepaliveAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 10,
});

const USER_AGENT = 'npminstall/' + require('../package.json').version + ' ' + urllib.USER_AGENT;
const MAX_RETRY = 5;

function* get(url, options, globalOptions) {
  options.httpsAgent = httpsKeepaliveAgent;
  options.agent = httpKeepaliveAgent;
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
  const hasUserSettings = typeof cnpmConfig.get(registryUri + ':username') === 'string' && typeof cnpmConfig.get(registryUri + ':_password') ===  'string';
  if (hasUserSettings && (authed || cnpmConfig.get(registryUri + ':always-auth') || cnpmConfig.get('always-auth'))) {
    const authToken = (`${cnpmConfig.get(registryUri + ':username')}:${Buffer.from(cnpmConfig.get(registryUri + ':_password'), 'base64').toString()}`);
    options.headers.Authorization = `Basic ${Buffer.from(authToken).toString('base64')}`;
  }
  const retry = options.retry || options.retry === 0 ? options.retry : MAX_RETRY;
  options.retry = undefined;
  debug('GET %s with headers: %j', url, options.headers);
  const result = yield _get(url, options, retry, globalOptions);
  debug('Response %s, headers: %j', result.status, result.headers);
  if (result.status < 100 || result.status >= 300) {
    if (options.streaming) {
      destroy(result.res);
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

function* _get(url, options, retry, globalOptions) {
  try {
    return yield urllib.request(url, options);
  } catch (err) {
    retry--;
    if (retry > 0) {
      const delay = 100 * (MAX_RETRY - retry);
      const logger = globalOptions && globalOptions.console || console;
      logger.warn('[npminstall:get] retry GET %s after %sms, retry left %s, error: %s, status: %s, headers: %j, \nstack: %s',
        url, delay, retry, err, err.status, err.headers, err.stack);
      yield utils.sleep(delay);
      return yield _get(url, options, retry, globalOptions);
    }

    throw err;
  }
}
