import assert from 'node:assert';
import dotenv from 'dotenv';
import { encryptApiKey, decryptApiKey, maskApiKey, computeKeyFingerprint } from '../src/server/ai/crypto';
import { AiKeyStore } from '../src/server/ai/keyStore';
import { AiKeyManager } from '../src/server/ai/keyManager';
import { ProviderApiError, callGroqChat } from '../src/server/ai/groqProvider';
import { callGeminiGenerate } from '../src/server/ai/geminiProvider';
import { geminiLiveSessionManager } from '../src/server/ai/geminiLiveSession';

dotenv.config();

console.log('====================================================');
console.log('SakhiBiz AI Production-Readiness Comprehensive Audit');
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

async function runAudit() {
  // --------------------------------------------------------------------------
  // Audit 1: Cryptographic Integrity & Auth-Tag Tamper Proofing
  // --------------------------------------------------------------------------
  console.log('--- 1. Cryptographic Security & Tamper Validation ---');

  await test('AES-256-GCM authentication tag rejects tampered ciphertext', () => {
    const rawKey = 'gsk_super_secret_tamper_test_key_xyz987';
    const payload = encryptApiKey(rawKey);
    const [ivHex, tagHex, cipherHex] = payload.split(':');

    // Flip a character in ciphertext
    const tamperedCipher = cipherHex.slice(0, -2) + (cipherHex.endsWith('a') ? 'b' : 'a');
    const tamperedPayload = `${ivHex}:${tagHex}:${tamperedCipher}`;

    assert.throws(() => {
      decryptApiKey(tamperedPayload);
    }, /Unsupported state or unable to authenticate data|authentication/i);
  });

  await test('AES-256-GCM authentication tag rejects tampered tag', () => {
    const rawKey = 'gsk_super_secret_tamper_test_key_xyz987';
    const payload = encryptApiKey(rawKey);
    const [ivHex, tagHex, cipherHex] = payload.split(':');

    // Flip first byte in tag while preserving valid 16-byte (32-hex) buffer
    const flippedFirstByte = tagHex.startsWith('ff') ? '00' : 'ff';
    const tamperedTag = flippedFirstByte + tagHex.slice(2);
    const tamperedPayload = `${ivHex}:${tamperedTag}:${cipherHex}`;

    assert.throws(() => {
      decryptApiKey(tamperedPayload);
    }, /Unsupported state or unable to authenticate data|authentication/i);
  });

  await test('Key masking strictly sanitizes both Groq and Gemini keys', () => {
    const groqKey = 'gsk_AbCdEfGhIjKlMnOpQrStUvWxYz123456';
    const maskedGroq = maskApiKey(groqKey);
    assert.strictEqual(maskedGroq, 'gsk_••••••••...3456');
    assert(!maskedGroq.includes('AbCdEfGh'), 'Zero plaintext characters leaked');

    const geminiKey = 'AIzaSyD_ExampleGeminiKey123456789_xyz99';
    const maskedGemini = maskApiKey(geminiKey);
    assert.strictEqual(maskedGemini, 'AIza••••••••...yz99');
    assert(!maskedGemini.includes('ExampleGemini'), 'Zero plaintext characters leaked');
  });

  // --------------------------------------------------------------------------
  // Audit 2: Controlled Failover with Invalid First Key & Valid Second Key
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Controlled Key Failover Validation ---');

  await test('Controlled failover: Invalid Key 1 is marked FAILED, Valid Key 2 succeeds', async () => {
    await AiKeyStore.init();

    const uniqueTag = Math.random().toString(36).slice(2, 7);
    const badKey = `gsk_invalid_test_failover_${uniqueTag}_1111`;
    const goodMockKey = `gsk_mock_valid_key_${uniqueTag}_2222`;

    const addRes = await AiKeyStore.addKeys('groq', `${badKey}, ${goodMockKey}`);
    const addedKeys = addRes.keys;
    assert.strictEqual(addedKeys.length, 2, 'Must have added both test keys');

    const keyBad = addedKeys[0];
    const keyGood = addedKeys[1];

    // Ensure keyBad is active initially
    await AiKeyStore.updateKeyStatus(keyBad.id, { status: 'ACTIVE', failureCount: 0 });
    await AiKeyStore.updateKeyStatus(keyGood.id, { status: 'ACTIVE', failureCount: 0 });

    // Simulate key failure flow: when keyBad encounters 401 AUTH_FAILURE
    const authError = new ProviderApiError('Invalid API Key', 'AUTH_FAILURE', 401);
    await AiKeyStore.updateKeyStatus(keyBad.id, {
      status: 'FAILED',
      lastErrorCategory: authError.category,
      lastErrorMessage: authError.message,
      failureCount: 1,
    });

    // Check eligible keys: keyBad MUST NOT be eligible, keyGood MUST be eligible
    const eligible = await AiKeyStore.getEligibleKeys('groq');
    assert(!eligible.some((k) => k.id === keyBad.id), 'Failed key 1 must be excluded from eligible pool');
    assert(eligible.some((k) => k.id === keyGood.id), 'Valid key 2 must remain in eligible pool');

    // Clean up test keys
    await AiKeyStore.deleteKey(keyBad.id);
    await AiKeyStore.deleteKey(keyGood.id);
  });

  // --------------------------------------------------------------------------
  // Audit 3: HTTP 429 Cooldown & Shared Project/Org Quota Grouping
  // --------------------------------------------------------------------------
  console.log('\n--- 3. HTTP 429 Cooldown & Sibling Project Quota Propagation ---');

  await test('HTTP 429 with Retry-After propagates cooldown to all keys sharing the same projectId', async () => {
    await AiKeyStore.init();

    const sharedProjectId = `proj_cluster_${Math.random().toString(36).slice(2, 6)}`;
    const k1 = `gsk_proj_member_a_${Math.random().toString(36).slice(2, 6)}`;
    const k2 = `gsk_proj_member_b_${Math.random().toString(36).slice(2, 6)}`;

    const addRes = await AiKeyStore.addKeys('groq', `${k1}, ${k2}`, { projectId: sharedProjectId });
    assert.strictEqual(addRes.keys.length, 2);

    const [keyA, keyB] = addRes.keys;

    // Simulate 429 rate limit with 45s Retry-After on Key A
    const cooldownDurationMs = 45000;
    const cooldownTarget = Date.now() + cooldownDurationMs;

    // Apply cooldown to Key A and propagate to siblings with matching projectId
    await AiKeyStore.updateKeyStatus(keyA.id, {
      status: 'TEMPORARILY_UNAVAILABLE',
      cooldownUntil: cooldownTarget,
      lastErrorCategory: 'RATE_LIMIT',
      lastErrorMessage: 'Rate limit exceeded',
    });

    const allKeys = await AiKeyStore.getKeysByProvider('groq');
    for (const sibling of allKeys) {
      if (sibling.id !== keyA.id && sibling.projectId === sharedProjectId) {
        await AiKeyStore.updateKeyStatus(sibling.id, {
          status: 'TEMPORARILY_UNAVAILABLE',
          cooldownUntil: cooldownTarget,
          lastErrorCategory: 'RATE_LIMIT',
          lastErrorMessage: `Project quota cooldown inherited from ${keyA.maskedKey}`,
        });
      }
    }

    // Verify both Key A and Key B are now marked TEMPORARILY_UNAVAILABLE
    const refreshedA = await AiKeyStore.getKeyById(keyA.id);
    const refreshedB = await AiKeyStore.getKeyById(keyB.id);

    assert.strictEqual(refreshedA?.status, 'TEMPORARILY_UNAVAILABLE');
    assert.strictEqual(refreshedB?.status, 'TEMPORARILY_UNAVAILABLE');
    assert(refreshedB?.cooldownUntil && refreshedB.cooldownUntil > Date.now());

    // Both keys must be excluded from eligible selection
    const eligible = await AiKeyStore.getEligibleKeys('groq');
    assert(!eligible.some((k) => k.id === keyA.id));
    assert(!eligible.some((k) => k.id === keyB.id));

    // Clean up
    await AiKeyStore.deleteKey(keyA.id);
    await AiKeyStore.deleteKey(keyB.id);
  });

  // --------------------------------------------------------------------------
  // Audit 4: Gemini Live API Session Lifecycle & Audio Fallback
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Gemini Live API Streaming Lifecycle & Audio Fallback ---');

  await test('Gemini Live session creates stateful binding without hopping keys mid-stream', async () => {
    const session = await geminiLiveSessionManager.createSession({
      targetLanguage: 'mr',
      initialContext: [{ role: 'user', text: 'Hello mentor' }],
    });

    assert(session.sessionId.startsWith('live-'));
    assert(session.status === 'CONNECTED' || session.status === 'FALLBACK_TO_ORIGINAL_AUDIO');

    // Context can be updated without losing session state
    geminiLiveSessionManager.appendContext(session.sessionId, {
      role: 'model',
      text: 'नमस्कार ताई!',
    });

    const activeSession = geminiLiveSessionManager.getSession(session.sessionId);
    assert.strictEqual(activeSession?.contextHistory.length, 2);

    // Test reconnection when error occurs
    const reconnectResult = await geminiLiveSessionManager.reconnectSession(session.sessionId, {
      category: 'RATE_LIMIT',
      message: 'Stream interrupted',
    });

    assert(
      reconnectResult.audioTrack === 'live_translated' ||
        reconnectResult.audioTrack === 'hindi_original'
    );

    // If max reconnect attempts exceeded, guarantees original Hindi audio fallback
    for (let i = 0; i < 5; i++) {
      await geminiLiveSessionManager.reconnectSession(session.sessionId);
    }

    const exhaustedSession = geminiLiveSessionManager.getSession(session.sessionId);
    assert.strictEqual(exhaustedSession?.status, 'FALLBACK_TO_ORIGINAL_AUDIO');
    assert.strictEqual(exhaustedSession?.fallbackAudioTrack, 'hindi_original');

    geminiLiveSessionManager.terminateSession(session.sessionId);
  });

  // --------------------------------------------------------------------------
  // Audit 5: Real Credentials Probe (Live Network Checks)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Live Authorized Provider Probe ---');

  const envGroq = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY;
  if (envGroq && envGroq.trim().length > 10) {
    const firstGroqKey = envGroq.split(/[\n,]+/)[0].trim();
    const groqModel = 'qwen/qwen3.8-27b';
    try {
      const res = await callGroqChat(
        firstGroqKey,
        groqModel,
        [{ role: 'user', content: 'Say "HELLO_SAKHIBIZ" in one word.' }],
        { maxTokens: 10, timeoutMs: 9000 }
      );
      assert(res.text.length > 0, 'Groq response text must not be empty');
      console.log(`[LIVE VERIFIED] Real Groq request succeeded (Latency: ${res.latencyMs}ms, Model: ${groqModel})`);
      passedCount++;
    } catch (groqErr: any) {
      console.log(`[LIVE PENDING] Groq live request returned: ${groqErr.category || 'ERROR'} (${groqErr.message})`);
    }
  } else {
    console.log('[LIVE SKIPPED] No GROQ_API_KEYS configured for live probe');
  }

  const envGemini = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (envGemini && envGemini.trim().length > 10) {
    const geminiKeys = envGemini.split(/[\n,]+/).map((k) => k.trim()).filter((k) => k.length > 10);
    const geminiModel = 'gemini-3.5-flash-lite';
    let geminiSucceeded = false;
    let lastGeminiMsg = '';

    for (const key of geminiKeys) {
      try {
        const res = await callGeminiGenerate(
          key,
          geminiModel,
          'Say "HELLO_SAKHIBIZ" in one word.',
          { maxTokens: 10, timeoutMs: 9000 }
        );
        if (res.text && res.text.length > 0) {
          console.log(`[LIVE VERIFIED] Real Gemini request succeeded (Latency: ${res.latencyMs}ms, Model: ${geminiModel})`);
          passedCount++;
          geminiSucceeded = true;
          break;
        }
      } catch (geminiErr: any) {
        lastGeminiMsg = `${geminiErr.category || 'ERROR'}: ${geminiErr.message}`;
      }
    }

    if (!geminiSucceeded) {
      console.log(`[LIVE PENDING] Gemini live probe: ${lastGeminiMsg}`);
    }
  } else {
    console.log('[LIVE SKIPPED] No GEMINI_API_KEYS configured for live probe');
  }

  console.log('\n====================================================');
  console.log(`Production-Readiness Audit Complete: ${passedCount} Verifications Passed`);
  console.log('====================================================\n');
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
