/**
 * Copyright(c) cnpm and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('npminstall:get');
const urllib = require('urllib');
const destroy = require('destroy');
const HttpAgent = require('http').Agent;
const HttpsAgent = require('https').Agent;

module.exports = get;

const httpKeepaliveAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
});
const httpsKeepaliveAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
});

const USER_AGENT = 'npminstall/' + require('../package.json').version + ' ' + urllib.USER_AGENT;

function* get(url, options, globalOptions) {
  options.httpsAgent = httpsKeepaliveAgent;
  options.agent = httpKeepaliveAgent;
  options.headers = options.headers || {};
  options.headers['User-Agent'] = USER_AGENT;
  if (globalOptions) {
    options.rejectUnauthorized = globalOptions.strictSSL;
  }
  const result = yield _get(url, options, 5);
  debug('GET %s, headers: %j from %j', result.status, result.headers, url);
  if (result.status < 100 || result.status >= 300) {
    if (options.streaming) {
      destroy(result.res);
    }
    let message = `GET ${url} response ${result.status} status`;
    if (result.headers && result.headers['npm-notice']) {
      message += `, ${result.headers['npm-notice']}`;
    }
    throw new Error(message);
  }
  return result;
}

const RETRY_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ENOTFOUND',
];

function* _get(url, options, retry) {
  try {
    return yield urllib.request(url, options);
  } catch (err) {
    retry--;
    if (retry > 0) {
      if (RETRY_CODES.indexOf(err.code) >= 0 || err.message.indexOf('socket hang up') >= 0) {
        debug('retry GET %s, retry left %s', url, retry);
        return yield _get(url, options, retry);
      }
    }

    throw err;
  }
}
