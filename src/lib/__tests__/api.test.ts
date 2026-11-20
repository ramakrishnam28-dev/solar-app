import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ApiError } from '../api';
import { memoryStore, KEYS } from '../kv';

type Handler = (url: string, init: any) => Promise<Response> | Response;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(handler: Handler, tokens: { access?: string; refresh?: string } = { access: 'old', refresh: 'r1' }) {
  const storage = memoryStore({
    ...(tokens.access ? { [KEYS.access]: tokens.access } : {}),
    ...(tokens.refresh ? { [KEYS.refresh]: tokens.refresh } : {}),
  });
  const calls: { url: string; method: string; auth?: string }[] = [];
  let lost = 0;
  const api = createApiClient({
    baseUrl: 'https://api.test',
    storage,
    retryDelayMs: 0,
    timeoutMs: 200,
    onSessionLost: () => { lost++; },
    fetchImpl: (async (url: any, init: any) => {
      calls.push({ url: String(url).replace('https://api.test/api/v1', ''), method: init.method, auth: init.headers.Authorization });
      return handler(String(url), init);
    }) as any,
  });
  return { api, storage, calls, lost: () => lost };
}

test('sends bearer token and returns data', async () => {
  const t = setup(() => json(200, { success: true, data: { hello: 'x' } }));
  const d = await t.api.get<{ hello: string }>('/customers');
  assert.equal(d.hello, 'x');
  assert.equal(t.calls[0].auth, 'Bearer old');
});

test('401 -> refresh -> retry succeeds and rotated tokens are stored', async () => {
  const t = setup((url, init) => {
    if (url.endsWith('/auth/refresh')) return json(200, { success: true, data: { accessToken: 'new', refreshToken: 'r2' } });
    return init.headers.Authorization === 'Bearer new' ? json(200, { data: { ok: 1 } }) : json(401, { message: 'expired' });
  });
  const d = await t.api.get<{ ok: number }>('/customers');
  assert.equal(d.ok, 1);
  assert.equal(await t.storage.get(KEYS.access), 'new');
  assert.equal(await t.storage.get(KEYS.refresh), 'r2');
  assert.equal(t.lost(), 0);
});

test('parallel 401s trigger exactly ONE refresh (refresh token rotates)', async () => {
  let refreshCalls = 0;
  const t = setup(async (url, init) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls++;
      await new Promise((r) => setTimeout(r, 20));
      // a second use of r1 would be rejected by the real server
      return JSON.parse(init.body).refreshToken === 'r1'
        ? json(200, { data: { accessToken: 'new', refreshToken: 'r2' } })
        : json(401, { message: 'invalid' });
    }
    return init.headers.Authorization === 'Bearer new' ? json(200, { data: { n: 1 } }) : json(401, {});
  });
  const res = await Promise.all([t.api.get('/a'), t.api.get('/b'), t.api.get('/c')]);
  assert.equal(res.length, 3);
  assert.equal(refreshCalls, 1);
  assert.equal(t.lost(), 0);
});

test('refresh rejected -> session lost, tokens cleared', async () => {
  const t = setup((url) => (url.endsWith('/auth/refresh') ? json(401, { message: 'bad token' }) : json(401, {})));
  await assert.rejects(() => t.api.get('/customers'), (e: any) => e instanceof ApiError && e.status === 401);
  assert.equal(t.lost(), 1);
  assert.equal(await t.storage.get(KEYS.access), null);
  assert.equal(await t.storage.get(KEYS.refresh), null);
});

test('refresh fails because server unreachable -> keep session, network error', async () => {
  const t = setup((url) => {
    if (url.endsWith('/auth/refresh')) throw new TypeError('network down');
    return json(401, {});
  });
  await assert.rejects(() => t.api.get('/customers'), (e: any) => e instanceof ApiError && e.network === true);
  assert.equal(t.lost(), 0);
  assert.equal(await t.storage.get(KEYS.refresh), 'r1');
});

test('GET retries on 503 then succeeds; POST is never retried', async () => {
  let n = 0;
  const t = setup(() => (++n < 3 ? json(503, { message: 'starting' }) : json(200, { data: { up: true } })));
  const d = await t.api.get<{ up: boolean }>('/x');
  assert.equal(d.up, true);
  assert.equal(n, 3);

  let m = 0;
  const t2 = setup(() => { m++; return json(503, { message: 'starting' }); });
  await assert.rejects(() => t2.api.post('/customers', { a: 1 }));
  assert.equal(m, 1);
});

test('login errors are shown as-is and never trigger refresh', async () => {
  const t = setup(() => json(401, { message: 'Invalid credentials' }), {});
  await assert.rejects(() => t.api.postPublic('/auth/login', { email: 'EMP-1', password: 'x' }), /Invalid credentials/);
  assert.equal(t.calls.length, 1);
  assert.equal(t.calls[0].auth, undefined);
  assert.equal(t.lost(), 0);
});

test('validation field errors are appended to the message', async () => {
  const t = setup(() => json(400, { message: 'Validation failed', errors: [{ message: 'Phone must be 10 digits' }] }));
  await assert.rejects(() => t.api.post('/customers', {}), /Validation failed: Phone must be 10 digits/);
});

test('timeout becomes a friendly network error', async () => {
  const t = setup((_url, init) => new Promise((_res, rej) => {
    init.signal.addEventListener('abort', () => { const e: any = new Error('aborted'); e.name = 'AbortError'; rej(e); });
  }));
  await assert.rejects(() => t.api.post('/slow', {}), (e: any) => e.network === true && /timed out/i.test(e.message));
});

test('second 401 after a successful refresh ends the session (no loop)', async () => {
  let refreshes = 0;
  const t = setup((url) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return json(200, { data: { accessToken: 'new', refreshToken: 'r2' } }); }
    return json(401, {});
  });
  await assert.rejects(() => t.api.get('/customers'), (e: any) => e.status === 401);
  assert.equal(refreshes, 1);
  assert.equal(t.lost(), 1);
});
