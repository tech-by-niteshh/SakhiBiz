// language: TypeScript, file: scripts/test-api-bundle.ts, runtime: Node.js (native ESM)
import http from 'http';
import assert from 'node:assert';

console.log('====================================================');
console.log('SakhiBiz Vercel Serverless Bundle (api/index.js) Verification');
console.log('====================================================\n');

async function runTests() {
  let passedCount = 0;
  function pass(desc: string) {
    console.log(`[PASS] ${desc}`);
    passedCount++;
  }

  // Suite 1: Module Loading & Architecture Verification
  console.log('--- Suite 1: Native Node.js ESM Import Resolution ---');
  let appModule: any;
  try {
    appModule = await import('../api/index.js');
    pass('api/index.js loaded successfully via native Node.js ESM loader (No ERR_MODULE_NOT_FOUND)');
  } catch (err: any) {
    console.error(`[FAIL] Failed to load api/index.js:`, err);
    process.exit(1);
  }

  const app = appModule.default;
  assert(app, 'api/index.js must have a default export');
  assert.strictEqual(typeof app, 'function', 'Default export must be an Express request listener function');
  pass('Default export is an initialized Express application');

  // Suite 2: HTTP Serverless Execution & Route Verification
  console.log('\n--- Suite 2: HTTP Endpoint Resolution & Status Checks ---');
  const server = http.createServer(app);
  const TEST_PORT = 3991;

  await new Promise<void>((resolve) => server.listen(TEST_PORT, '127.0.0.1', () => resolve()));
  console.log(`Test server running at http://127.0.0.1:${TEST_PORT}\n`);

  async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
    return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${TEST_PORT}${path}`,
        {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            let parsed = raw;
            try {
              parsed = JSON.parse(raw);
            } catch {}
            resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
          });
        }
      );
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  try {
    // 1. Health check
    const healthRes = await request('/api/health');
    assert.strictEqual(healthRes.status, 200, `Expected 200 for /api/health, got ${healthRes.status}`);
    assert.strictEqual(healthRes.body.status, 'healthy');
    pass('GET /api/health returns 200 OK and healthy status');

    // 2. Health check Vercel rewrite parity
    const healthParityRes = await request('/health');
    assert.strictEqual(healthParityRes.status, 200, `Expected 200 for /health, got ${healthParityRes.status}`);
    pass('GET /health (dual-path rewrite) returns 200 OK');

    // 3. Unauthenticated /api/auth/me (Production Incident Endpoint)
    const meRes = await request('/api/auth/me');
    assert.strictEqual(meRes.status, 401, `Expected 401 Unauthorized for /api/auth/me, got ${meRes.status}`);
    assert.strictEqual(meRes.body.error, 'Authentication required. Please sign in.');
    pass('GET /api/auth/me returns 401 Unauthorized (Controlled error, NOT 500 ERR_MODULE_NOT_FOUND)');

    // 4. Missing fields /api/auth/register (Production Incident Endpoint)
    const registerRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.strictEqual(registerRes.status, 400, `Expected 400 for empty registration, got ${registerRes.status}`);
    assert.strictEqual(registerRes.body.error, 'A valid email address is required.');
    pass('POST /api/auth/register validates input and returns 400 Bad Request (NOT 500 ERR_MODULE_NOT_FOUND)');

    // 5. Missing fields /api/auth/login
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.strictEqual(loginRes.status, 400, `Expected 400 for empty login, got ${loginRes.status}`);
    assert.strictEqual(loginRes.body.error, 'Email and password are required.');
    pass('POST /api/auth/login validates input and returns 400 Bad Request (NOT 500)');

    // 6. Feedback endpoint
    const feedbackOptRes = await request('/api/feedback', { method: 'OPTIONS' });
    assert.strictEqual(feedbackOptRes.status, 200, `Expected 200 for /api/feedback OPTIONS, got ${feedbackOptRes.status}`);
    pass('OPTIONS /api/feedback returns 200 OK with CORS preflight');

  } finally {
    server.close();
  }

  console.log(`\n====================================================`);
  console.log(`All ${passedCount} Vercel bundle tests passed successfully!`);
  console.log(`====================================================\n`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
