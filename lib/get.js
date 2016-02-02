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
const urlparse = require('url').parse;
const dns = require('mz/dns');
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

function* get(url, options) {
  const info = urlparse(url);
  options.httpsAgent = httpsKeepaliveAgent;
  options.agent = httpKeepaliveAgent;
  options.headers = options.headers || {};
  options.headers.Host = info.hostname;
  options.headers['User-Agent'] = USER_AGENT;
  const address = yield dnslookup(info.hostname);
  const newUrl = url.replace(info.hostname, address);
  const result = yield urllib.request(newUrl, options);
  debug('GET %s, headers: %j from %j', result.status, result.headers, url);
  if (result.status < 100 || result.status >= 300) {
    let message = `GET ${url} response ${result.status} status`;
    if (result.headers && result.headers['npm-notice']) {
      message += `, ${result.headers['npm-notice']}`;
    }
    throw new Error(message);
  }
  return result;
}

const DNS_CACHE = new Map();

function* dnslookup(hostname) {
  let cache = DNS_CACHE.get(hostname);
  const now = Date.now();
  // dns cache 30s
  if (cache && now - cache.timestamp < 30000) {
    return cache.address;
  }
  cache = {
    address: null,
    timestamp: 0,
  };
  const r = yield dns.lookup(hostname);
  cache.address = r[0];
  cache.timestamp = Date.now();
  DNS_CACHE.set(hostname, cache);
  return cache.address;
}
