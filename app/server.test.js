import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './server.js';

test('health endpoint returns success', () => {
  const response = { status: 0, writeHead(code) { this.status = code; return this; }, end() {} };
  handler({ url: '/healthz', method: 'GET' }, response);
  assert.equal(response.status, 200);
});
