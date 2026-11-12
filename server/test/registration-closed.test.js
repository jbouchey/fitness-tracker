process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.ALLOW_REGISTRATION = 'false';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const app = require('../src/app');

test('sign-up can be switched off with ALLOW_REGISTRATION=false', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'long-enough-password' }),
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual((await res.json()).code, 'REGISTRATION_CLOSED');
  } finally {
    server.close();
  }
});
