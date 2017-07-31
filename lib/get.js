'use strict';

const debug = require('debug')('npminstall:get');
const urllib = require('urllib');
const destroy = require('destroy');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const utils = require('./utils');

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
    const result = yield urllib.request(url, options);
    if (result.data && Buffer.isBuffer(result.data) && result.data.length > 0 &&
        options.headers.accept &&
        options.headers.accept.indexOf('application/vnd.npm.install-v1+json') >= 0) {
      result.data = JSON.parse(result.data);
      debug('%s support vnd.npm.install-v1+json format, modified', result.data.name, result.data.modified);
    }
    return result;
  } catch (err) {
    retry--;
    if (retry > 0) {
      const delay = 100 * (MAX_RETRY - retry);
      const logger = globalOptions && globalOptions.console || console;
      logger.warn('[npminstall:get] retry GET %s after %sms, retry left %s, error: %s',
        url, delay, retry, err);
      yield utils.sleep(delay);
      return yield _get(url, options, retry, globalOptions);
    }

    throw err;
  }
}
