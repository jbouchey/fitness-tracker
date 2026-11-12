// Runs the Express app without a database. Every request here is rejected
// before any query is made, so no Postgres is needed.
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.CLIENT_URL = 'http://client.test';
process.env.TRUST_PROXY = '2'; // Cloudflare Tunnel + nginx

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const app = require('../src/app');
const { signToken, signStravaState, verifyStravaState } = require('../src/utils/jwtUtils');

let server;
let base;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

function post(path, body, headers = {}) {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    redirect: 'manual',
  });
}

test('health check answers', async () => {
  const res = await fetch(base + '/api/health');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
});

test('invalid sign-up input is a 400 with a readable message, not a 500', async () => {
  const res = await post('/api/auth/register', {}, { 'X-Forwarded-For': '198.51.100.1, 10.0.0.2' });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.code, 'VALIDATION_ERROR');
  assert.match(body.error, /email/);
});

test('short password is reported by name', async () => {
  const res = await post(
    '/api/auth/register',
    { email: 'a@example.com', password: 'short' },
    { 'X-Forwarded-For': '198.51.100.2, 10.0.0.2' }
  );
  assert.strictEqual(res.status, 400);
  assert.match((await res.json()).error, /at least 8 characters/);
});

test('malformed JSON is a 400', async () => {
  const res = await post('/api/auth/register', '{not json', { 'X-Forwarded-For': '198.51.100.3, 10.0.0.2' });
  assert.strictEqual(res.status, 400);
});

test('data routes refuse requests without a session', async () => {
  for (const path of ['/api/workouts', '/api/strava/status', '/api/adventure/quest', '/api/auth/me']) {
    const res = await fetch(base + path);
    assert.strictEqual(res.status, 401, path);
  }
});

test('login limit is per visitor, not shared, and cannot be dodged with a forged header', async () => {
  // Behind two proxies the header reads "<visitor>, <tunnel>". nginx appends the
  // tunnel address, so the visitor is the second entry from the right.
  const visitorA = { 'X-Forwarded-For': '203.0.113.10, 10.0.0.2' };
  const visitorB = { 'X-Forwarded-For': '203.0.113.20, 10.0.0.2' };
  const visitorAForged = { 'X-Forwarded-For': '9.9.9.9, 203.0.113.10, 10.0.0.2' };

  for (let i = 0; i < 5; i++) {
    const res = await post('/api/auth/login', {}, visitorA);
    assert.strictEqual(res.status, 400, `attempt ${i + 1}`);
  }
  assert.strictEqual((await post('/api/auth/login', {}, visitorA)).status, 429, 'sixth attempt is blocked');
  assert.strictEqual((await post('/api/auth/login', {}, visitorAForged)).status, 429, 'forged prefix does not help');
  assert.strictEqual((await post('/api/auth/login', {}, visitorB)).status, 400, 'another visitor is unaffected');
});

test('Strava state is signed and single-purpose', async () => {
  const state = signStravaState('user_123');
  assert.strictEqual(verifyStravaState(state), 'user_123');

  // A plain user id (the old behaviour) is rejected
  assert.throws(() => verifyStravaState('user_123'));
  // A session token cannot be used as a state value
  const session = signToken({ userId: 'user_123', email: 'a@example.com', tokenVersion: 0 });
  assert.throws(() => verifyStravaState(session));
});

test('Strava callback rejects an unsigned state before touching the database', async () => {
  const res = await fetch(base + '/api/strava/callback?code=abc&state=user_123', { redirect: 'manual' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get('location'), 'http://client.test/profile?strava=denied');
});

test('a Strava state value is not accepted as a login session', async () => {
  const res = await fetch(base + '/api/workouts', {
    headers: { Authorization: `Bearer ${signStravaState('user_123')}` },
  });
  assert.strictEqual(res.status, 401);
  assert.match((await res.json()).error, /Invalid or expired token/);
});

test('Strava webhook answers 200 and ignores malformed events', async () => {
  const res = await post('/api/strava/webhook', {
    object_type: 'activity',
    aspect_type: 'create',
    object_id: '1; drop',
    owner_id: 'abc',
  });
  assert.strictEqual(res.status, 200);
});

test('Strava webhook verification refuses a missing token', async () => {
  const res = await fetch(base + '/api/strava/webhook?hub.mode=subscribe&hub.challenge=x');
  assert.strictEqual(res.status, 403);
});
