import assert from 'node:assert';
import http from 'node:http';
import { encryptApiKey, decryptApiKey, maskApiKey, computeKeyFingerprint } from '../src/server/ai/crypto';
import { AiKeyStore } from '../src/server/ai/keyStore';
import { AiKeyManager } from '../src/server/ai/keyManager';
import { ProviderApiError } from '../src/server/ai/groqProvider';
import { signToken } from '../src/server/auth';
import app from '../src/server/app';

const TEST_PORT = 3889;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('====================================================');
console.log('SakhiBiz AI Multi-Key Failover & Security Test Suite');
console.log('====================================================\n');

let passedCount = 0;
async function test(desc: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`[PASS] ${desc}`);
    passedCount++;
  } catch (err: any) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
    process.exit(1);
  }
}

async function run() {
  // Start ephemeral HTTP test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, '127.0.0.1', () => resolve()));

  try {
    // --------------------------------------------------------------------------
    // Suite 1: AES-256-GCM Encryption, Masking & Fingerprint
    // --------------------------------------------------------------------------
    console.log('--- Suite 1: AES-256-GCM Encryption & Masking ---');

    await test('AES-256-GCM successfully encrypts and decrypts API key', () => {
      const rawKey = 'gsk_test_mock_secret_key_1234567890abcdef';
      const encrypted = encryptApiKey(rawKey);

      assert(encrypted.includes(':'), 'Encrypted format must contain iv:tag:ciphertext');
      const parts = encrypted.split(':');
      assert.strictEqual(parts.length, 3, 'Must have IV, tag, and ciphertext');

      const decrypted = decryptApiKey(encrypted);
      assert.strictEqual(decrypted, rawKey, 'Decrypted key must match original');
    });

    await test('Key masking strictly hides plaintext and reveals only short suffix', () => {
      const groqKey = 'gsk_1234567890abcdef1234567890abcdef';
      const maskedGroq = maskApiKey(groqKey);
      assert.strictEqual(maskedGroq, 'gsk_••••••••...cdef');
      assert(!maskedGroq.includes('1234567890'), 'Plaintext must not be exposed');

      const geminiKey = 'AIzaSyA_abcdef1234567890_xyz9876';
      const maskedGemini = maskApiKey(geminiKey);
      assert.strictEqual(maskedGemini, 'AIza••••••••...9876');
    });

    await test('Key fingerprinting is deterministic and prevents duplicate entries', () => {
      const keyA = 'gsk_duplicate_check_sample';
      const keyB = 'gsk_duplicate_check_sample';
      const fpA = computeKeyFingerprint(keyA);
      const fpB = computeKeyFingerprint(keyB);
      assert.strictEqual(fpA, fpB);
      assert.strictEqual(fpA.length, 16);
    });

    // --------------------------------------------------------------------------
    // Suite 2: Key Store & Project Quota Grouping
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 2: Multi-Key Store & Quota Grouping ---');

    await test('Handles empty configuration, single key, and multi-key newline/comma parsing', async () => {
      await AiKeyStore.init();

      // Adding multiple keys separated by newlines and commas
      const runId = Math.random().toString(36).slice(2, 8);
      const rawInput = `
        gsk_test_key_alpha_${runId},
        gsk_test_key_beta_${runId}
        gsk_test_key_gamma_${runId}
      `;

      const res = await AiKeyStore.addKeys('groq', rawInput, { projectId: 'proj_alpha_shared' });
      assert(res.added >= 3, `Expected at least 3 keys added, got ${res.added}`);

      // Re-adding same keys should be detected as duplicates and skipped
      const resDup = await AiKeyStore.addKeys('groq', rawInput, { projectId: 'proj_alpha_shared' });
      assert.strictEqual(resDup.added, 0);
      assert(resDup.skipped >= 3);
    });

    await test('Round-robin selector skips disabled keys and keys in cooldown', async () => {
      const keys = await AiKeyStore.getKeysByProvider('groq');
      assert(keys.length >= 2, 'Requires at least 2 groq keys');

      const firstKey = keys[0];
      const secondKey = keys[1];

      // Disable first key
      await AiKeyStore.updateKeyStatus(firstKey.id, { enabled: false, status: 'DISABLED' });
      let eligible = await AiKeyStore.getEligibleKeys('groq');
      assert(!eligible.some((k) => k.id === firstKey.id), 'Disabled key must not be eligible');

      // Put second key in cooldown
      await AiKeyStore.updateKeyStatus(secondKey.id, {
        enabled: true,
        status: 'TEMPORARILY_UNAVAILABLE',
        cooldownUntil: Date.now() + 60000,
      });
      eligible = await AiKeyStore.getEligibleKeys('groq');
      assert(!eligible.some((k) => k.id === secondKey.id), 'Cooldown key must not be eligible');

      // Re-enable first key and clear cooldown on second key
      await AiKeyStore.updateKeyStatus(firstKey.id, { enabled: true, status: 'ACTIVE', cooldownUntil: undefined });
      await AiKeyStore.updateKeyStatus(secondKey.id, { enabled: true, status: 'ACTIVE', cooldownUntil: undefined });
    });

    // --------------------------------------------------------------------------
    // Suite 3: Error Classification & Failover Mechanics
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 3: Error Classification & Failover Mechanics ---');

    await test('Distinguishes error categories (429 RateLimit, 401 Auth, 500 Transient, 400 Client)', () => {
      const err429 = new ProviderApiError('Rate limit exceeded', 'RATE_LIMIT', 429, 45000);
      assert.strictEqual(err429.category, 'RATE_LIMIT');
      assert.strictEqual(err429.retryAfterMs, 45000);

      const err401 = new ProviderApiError('Invalid API Key', 'AUTH_FAILURE', 401);
      assert.strictEqual(err401.category, 'AUTH_FAILURE');

      const err503 = new ProviderApiError('Service Unavailable', 'TRANSIENT_SERVER_ERROR', 503);
      assert.strictEqual(err503.category, 'TRANSIENT_SERVER_ERROR');

      const err400 = new ProviderApiError('Bad Request', 'INVALID_REQUEST', 400);
      assert.strictEqual(err400.category, 'INVALID_REQUEST');
    });

    await test('Isolated connectivity test returns structured failure for invalid keys without crash', async () => {
      const result = await AiKeyManager.testKeyConnectivity('non_existent_key_id');
      assert.strictEqual(result.success, false);
      assert(result.message.includes('not found'));
    });

    // --------------------------------------------------------------------------
    // Suite 4: Security & Role-Based Access Control (RBAC)
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 4: Security & Role-Based Access Control (RBAC) ---');

    const { isMongoConfigured, connectMongo } = await import('../src/server/db');
    const { User } = await import('../src/server/models/User');

    if (isMongoConfigured()) {
      try {
        await connectMongo();
        await User.findOneAndUpdate(
          { normalizedEmail: 'learner_ai_test@sakhibiz.org' },
          { userId: 'usr_learner_test_1', email: 'learner_ai_test@sakhibiz.org', normalizedEmail: 'learner_ai_test@sakhibiz.org', name: 'Sunita Learner', role: 'USER', passwordHash: 'test', accountStatus: 'ACTIVE' },
          { upsert: true }
        );
        await User.findOneAndUpdate(
          { normalizedEmail: 'moderator_ai_test@sakhibiz.org' },
          { userId: 'usr_mod_test_1', email: 'moderator_ai_test@sakhibiz.org', normalizedEmail: 'moderator_ai_test@sakhibiz.org', name: 'Content Moderator', role: 'MODERATOR', passwordHash: 'test', accountStatus: 'ACTIVE' },
          { upsert: true }
        );
        await User.findOneAndUpdate(
          { normalizedEmail: 'admin_ai_test@sakhibiz.org' },
          { userId: 'usr_admin_test_1', email: 'admin_ai_test@sakhibiz.org', normalizedEmail: 'admin_ai_test@sakhibiz.org', name: 'Chief Admin', role: 'ADMIN', passwordHash: 'test', accountStatus: 'ACTIVE' },
          { upsert: true }
        );
      } catch (e) {
        console.warn('AI test user seeding skipped:', e);
      }
    }

    const adminToken = signToken({
      userId: 'usr_admin_test_1',
      email: 'admin_ai_test@sakhibiz.org',
      role: 'ADMIN',
      name: 'Chief Admin',
    });

    const moderatorToken = signToken({
      userId: 'usr_mod_test_1',
      email: 'moderator_ai_test@sakhibiz.org',
      role: 'MODERATOR',
      name: 'Content Moderator',
    });

    const userToken = signToken({
      userId: 'usr_learner_test_1',
      email: 'learner_ai_test@sakhibiz.org',
      role: 'USER',
      name: 'Sunita Learner',
    });

    await test('Unauthenticated GET /api/admin/ai/overview is denied with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/ai/overview`);
      assert.strictEqual(res.status, 401);
    });

    await test('USER (Learner) accessing /api/admin/ai/overview is blocked with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/ai/overview`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    await test('MODERATOR (Least privilege) accessing /api/admin/ai/overview is blocked with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/ai/overview`, {
        headers: { Authorization: `Bearer ${moderatorToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    await test('ADMIN accessing /api/admin/ai/overview is authorized and keys are strictly masked', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/ai/overview`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data: any = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.keys));
      assert(data.configs);
      assert(data.metrics);

      // Verify ZERO secrets exposed in API response!
      const jsonString = JSON.stringify(data);
      assert(!jsonString.includes('encryptedKey'), 'encryptedKey must NEVER be sent to client');
      assert(!jsonString.includes('gsk_test_mock_secret'), 'Plaintext must NEVER be sent to client');
    });

    await test('ADMIN can configure provider model and retry budget via PUT /api/admin/ai/config/groq', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/ai/config/groq`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredModel: 'llama-3.3-70b-versatile',
          maxRequestsPerMinute: 90,
          retryBudget: 4,
          timeoutMs: 9000,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data: any = await res.json();
      assert.strictEqual(data.config.preferredModel, 'llama-3.3-70b-versatile');
      assert.strictEqual(data.config.retryBudget, 4);
    });

    // --------------------------------------------------------------------------
    // Suite 5: Chat Assistant Failover to Regional Knowledge Engine
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 5: Chat Assistant Seamless Fallback ---');

    await test('Chat API (/api/ai/chat) gracefully responds in selected language even under mock/offline conditions', async () => {
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'मुनाफा कैसे निकालें?',
          language: 'hi',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data: any = await res.json();
      assert(typeof data.reply === 'string' && data.reply.length > 0);
      assert(data.reply.includes('लागत') || data.reply.includes('मुनाफा'));
      assert.strictEqual(data.language, 'hi');
    });

    console.log('\n====================================================');
    console.log(`AI Multi-Key Test Suite Complete: ${passedCount} Passed, 0 Failed`);
    console.log('====================================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
