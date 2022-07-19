'use strict';

const assert = require('assert');
const path = require('path');
const util = require('util');
const tnpm = require('..');
const { download, Downloader } = tnpm;

describe('test/index.test.js', () => {
  const tasks = [
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/a-sync-waterfall-1.0.1.tgz', name: 'a-sync-waterfall', version: '1.0.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/abbrev-1.1.1.tgz', name: 'abbrev', version: '1.1.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/accepts-1.3.7.tgz', name: 'accepts', version: '1.3.7' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/acorn-5.7.4.tgz', name: 'acorn', version: '5.7.4' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/acorn-es7-plugin-1.1.7.tgz', name: 'acorn-es7-plugin', version: '1.1.7' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/address-0.0.3.tgz', name: 'address', version: '0.0.3' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/address-1.1.2.tgz', name: 'address', version: '1.1.2' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/agent-base-6.0.2.tgz', name: 'agent-base', version: '6.0.2' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/agentkeepalive-3.5.2.tgz', name: 'agentkeepalive', version: '3.5.2' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/agentkeepalive-4.1.3.tgz', name: 'agentkeepalive', version: '4.1.3' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/agentx-1.10.7.tgz', name: 'agentx', version: '1.10.7' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/aggregate-error-3.1.0.tgz', name: 'aggregate-error', version: '3.1.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/ajv-6.12.6.tgz', name: 'ajv', version: '6.12.6' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/algorithmjs-1.0.0.tgz', name: 'algorithmjs', version: '1.0.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/ali-mc-1.3.0.tgz', name: 'ali-mc', version: '1.3.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/ali-oss-4.16.0.tgz', name: 'ali-oss', version: '4.16.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/ali-oss-6.12.0.tgz', name: 'ali-oss', version: '6.12.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/ali-rds-3.4.0.tgz', name: 'ali-rds', version: '3.4.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/ansi-escapes-3.2.0.tgz', name: 'ansi-escapes', version: '3.2.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8888/ansi-regex-2.1.1.tgz', name: 'ansi-regex', version: '2.1.1' },
  ];

  it('should work', async () => {
    const entries = [];
    const opts = {
      bucketCount: 40,
      httpConcurrentCount: 40,
      downloadDir: path.join(__dirname, 'fixtures/tars'),
      entryWhitelist: [ '*/package.json' ],
      downloadTimeout: 30000,
      entryListener: entry => {
        entries.push(entry);
      },
    };
    const result = await download(tasks, opts);
    assert(result);
    // acorn-es7-plugin 中有两个 package.json 所以有 21 个文件
    assert(entries.length === 21);
  });

  it('should work', async () => {
    const tasks = [
      { sha: 'sha1-LRd/ZS+jHpObRDjVNBSZ36OCXpk=', url: 'http://127.0.0.1:8888/ansi-regex-2.1.1.tgz', name: 'lodash.get', version: '4.4.2' },
    ];
    const entries = [];
    const opts = {
      bucketCount: 40,
      httpConcurrentCount: 40,
      downloadTimeout: 30000,
      downloadDir: path.join(__dirname, 'fixtures/tars'),
      entryWhitelist: [ '*/package.json' ],
      entryListener: entry => {
        entries.push(entry);
      },
    };
    const result = await download(tasks, opts);
    assert(result);
  });

  describe('Downloader', () => {
    it('download should work', async () => {
      const entries = [];
      const downloader = new Downloader({
        bucketCount: 40,
        httpConcurrentCount: 40,
        downloadTimeout: 30000,
        downloadDir: path.join(__dirname, 'fixtures/tars'),
        entryWhitelist: [ '*/package.json' ],
        entryListener: entry => {
          entries.push(entry);
        },
      });
      await downloader.init();
      await Promise.all(tasks.map(async task => {
        await downloader.download(task);
      }));
      const dumpContext = JSON.parse(downloader.dump());
      assert(entries.length === 21);
      assert(dumpContext.tocMap);
      assert(dumpContext.indices);
    });
  });
});
