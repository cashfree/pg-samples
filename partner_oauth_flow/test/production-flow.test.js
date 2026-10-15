const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('complete OAuth security suite also passes with production URLs and mocked credentials', () => {
  const childEnv = { ...process.env, OAUTH_TEST_ENV: 'production' };
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'security.test.js')], {
    env: childEnv, encoding: 'utf8', timeout: 30000
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /# tests 13/);
  assert.match(result.stdout, /# fail 0/);
});
