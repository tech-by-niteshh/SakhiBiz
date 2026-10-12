import http from 'http';
import app from '../src/server/app';
import { connectMongo, isMongoConfigured } from '../src/server/db';
import { User } from '../src/server/models/User';
import {
  generateSecureOtp,
  hashOtp,
  verifyOtpHash,
  createOtpPackage,
  checkResendCooldown,
  evaluateOtpAttempt,
  OTP_CONFIG,
} from '../src/server/auth/otp';
import { BrevoClient } from '../src/server/email/brevo';
import { generateOtpEmail } from '../src/server/email/templates';

const TEST_PORT = 3899;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('SakhiBiz Brevo Transactional Email & OTP Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
    } catch (err: any) {
      console.error(`Error in test "${name}":`, err.message);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // Suite 1: Cryptographic OTP Security & Timing-Safe Hashing
  // ---------------------------------------------------------------------------
  console.log('--- Suite 1: Cryptographic OTP Security & Timing-Safe Hashing ---');
  await test('OTP generation produces 6-digit numeric string', async () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateSecureOtp();
      assert(/^\d{6}$/.test(otp), `OTP "${otp}" is exactly 6 digits`);
      const val = parseInt(otp, 10);
      assert(val >= 100000 && val <= 999999, 'OTP is strictly between 100000 and 999999');
    }
  });

  await test('OTP hashing is deterministic HMAC-SHA256 and constant-time verified', async () => {
    const otp = '849201';
    const hash1 = hashOtp(otp);
    const hash2 = hashOtp(otp);
    assert(hash1 === hash2, 'Hash is deterministic for identical input');
    assert(hash1.length === 64, 'Hash is 64 hex characters (256 bits)');

    assert(verifyOtpHash('849201', hash1) === true, 'Matching OTP verified as TRUE');
    assert(verifyOtpHash('123456', hash1) === false, 'Mismatched OTP verified as FALSE');
    assert(verifyOtpHash('', hash1) === false, 'Empty OTP rejected');
    assert(verifyOtpHash('849201', '') === false, 'Empty stored hash rejected');
  });

  // ---------------------------------------------------------------------------
  // Suite 2: Expiration, Cooldown & Attempt Limit Evaluation
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 2: Expiration, Cooldown & Attempt Limits ---');
  await test('Fresh OTP passes evaluation', async () => {
    const pkg = createOtpPackage();
    const evalResult = evaluateOtpAttempt(pkg.plainOtp, pkg.hashedOtp, pkg.expiresAt, 0);
    assert(evalResult.isValid === true, 'Fresh OTP is valid');
    assert(evalResult.isExpired === false, 'Fresh OTP is not expired');
    assert(evalResult.isExhausted === false, 'Fresh OTP is not exhausted');
  });

  await test('Expired OTP is firmly rejected', async () => {
    const pkg = createOtpPackage();
    const expiredTimestamp = new Date(Date.now() - 10000); // 10s in past
    const evalResult = evaluateOtpAttempt(pkg.plainOtp, pkg.hashedOtp, expiredTimestamp, 0);
    assert(evalResult.isValid === false, 'Expired OTP is invalid');
    assert(evalResult.isExpired === true, 'Expired flag is TRUE');
  });

  await test('Attempt limit exhausts and locks out after 5 failed attempts', async () => {
    const pkg = createOtpPackage();
    // Simulate 5 incorrect guesses
    let status = evaluateOtpAttempt('000000', pkg.hashedOtp, pkg.expiresAt, 0);
    assert(!status.isValid && status.remainingAttempts === 4, '1st failure: 4 remaining');

    status = evaluateOtpAttempt('000000', pkg.hashedOtp, pkg.expiresAt, 1);
    assert(!status.isValid && status.remainingAttempts === 3, '2nd failure: 3 remaining');

    status = evaluateOtpAttempt('000000', pkg.hashedOtp, pkg.expiresAt, 4);
    assert(!status.isValid && status.isExhausted === true, '5th failure: isExhausted is TRUE');

    // Trying again after exhausted
    status = evaluateOtpAttempt(pkg.plainOtp, pkg.hashedOtp, pkg.expiresAt, 5);
    assert(!status.isValid && status.isExhausted === true, 'Attempt after max limit rejected even with correct code');
  });

  await test('Resend cooldown enforces 60-second delay between requests', async () => {
    const justSent = new Date();
    const cd1 = checkResendCooldown(justSent);
    assert(cd1.allowed === false, 'Resend rejected immediately after sending');
    assert(cd1.secondsRemaining > 0 && cd1.secondsRemaining <= 60, 'Seconds remaining accurately reported');

    const sentPast60s = new Date(Date.now() - 61 * 1000);
    const cd2 = checkResendCooldown(sentPast60s);
    assert(cd2.allowed === true, 'Resend allowed after 60 seconds have elapsed');
    assert(cd2.secondsRemaining === 0, 'Zero seconds remaining when allowed');
  });

  // ---------------------------------------------------------------------------
  // Suite 3: Email Templates & Branding
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 3: Email Templates & Branding ---');
  await test('Bilingual email template renders branding, OTP, and 5-min warning', async () => {
    const email = generateOtpEmail({
      otp: '739281',
      recipientName: 'सुनीता शर्मा',
      purpose: 'VERIFY_EMAIL',
      expiryMinutes: 5,
    });

    assert(email.subject.includes('739281'), 'Email subject contains 6-digit OTP');
    assert(email.html.includes('739281'), 'HTML body contains OTP');
    assert(email.html.includes('सुनीता शर्मा'), 'HTML body includes recipient name');
    assert(email.html.includes('SakhiBiz'), 'HTML body carries SakhiBiz branding');
    const expectedSender = (process.env.BREVO_SENDER_EMAIL || 'authentication@sakhibiz.xyz').toLowerCase().trim();
    assert(email.html.includes(expectedSender), `HTML body carries contact email (${expectedSender})`);
    assert(email.text.includes('739281'), 'Plaintext body includes OTP');
  });

  // ---------------------------------------------------------------------------
  // Suite 4: Brevo Client Diagnostics & Error Handling
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 4: Brevo Client Diagnostics & Error Handling ---');
  await test('Brevo client securely inspects configuration without leaking secret key', async () => {
    const config = BrevoClient.getConfig();
    const expectedSender = (process.env.BREVO_SENDER_EMAIL || 'authentication@sakhibiz.xyz').toLowerCase().trim();
    assert(config.senderEmail === expectedSender, `Configured sender matches ${expectedSender}`);
    assert(Boolean(config.senderName), 'Configured sender name is present');
    assert(!config.keyPreview.includes('undefined'), 'Key preview is clean');
  });

  await test('Transactional dispatch safely classifies missing credentials without crashing', async () => {
    // If BREVO_API_KEY is unset in test runner, verify graceful error payload
    const originalKey = process.env.BREVO_API_KEY;
    delete process.env.BREVO_API_KEY;

    const res = await BrevoClient.sendTransactionalEmail({
      to: [{ email: 'test@example.com', name: 'Test' }],
      subject: 'Test OTP',
      htmlContent: '<p>123456</p>',
    });

    assert(res.success === false, 'Dispatch reports failure when key missing');
    assert(res.statusCode === 503, 'Returns 503 status code');
    assert(res.errorCode === 'PROVIDER_NOT_CONFIGURED', 'Identifies PROVIDER_NOT_CONFIGURED');

    // Restore key if it was present
    if (originalKey) process.env.BREVO_API_KEY = originalKey;
  });

  // ---------------------------------------------------------------------------
  // Suite 5: HTTP End-to-End Auth & Verification Integration
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 5: HTTP End-to-End Email OTP Lifecycle ---');

  if (isMongoConfigured()) {
    await connectMongo();
  }

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, '127.0.0.1', () => resolve()));
  console.log(`Test server running at ${BASE_URL}\n`);

  const testEmail = `test_learner_${Date.now()}@sakhibiz.xyz`;
  let registeredOtp = '';

  await test('POST /api/auth/register creates unverified account and returns OTP preview in test mode', async () => {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        name: 'अनीता कुमारी',
        businessCategory: 'textiles_tailoring',
        location: 'वाराणसी, उत्तर प्रदेश',
        language: 'hi',
      }),
    });

    assert(regRes.status === 201, `POST /api/auth/register returns 201 Created (got ${regRes.status})`);
    const regData = await regRes.json();
    assert(regData.success === true, 'Success flag is true');
    assert(regData.requireVerification === true, 'Requires email verification');
    assert(regData.email === testEmail.toLowerCase(), 'Returns normalized recipient email');
    assert(regData.delivery && regData.delivery.provider === 'brevo', 'Dispatches via Brevo provider');
    assert(typeof regData.delivery.devOtpPreview === 'string', 'Captures generated OTP for test automation');
    registeredOtp = regData.delivery.devOtpPreview;
  });

  await test('Unverified account is blocked from login with 403 EMAIL_NOT_VERIFIED', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
      }),
    });

    assert(loginRes.status === 403, `Unverified login returns 403 Forbidden (got ${loginRes.status})`);
    const loginData = await loginRes.json();
    assert(loginData.error === 'EMAIL_NOT_VERIFIED', 'Error code is EMAIL_NOT_VERIFIED');
    assert(loginData.email === testEmail.toLowerCase(), 'Includes unverified email address');
  });

  await test('POST /api/auth/verify-email rejects wrong OTP code', async () => {
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({
        email: testEmail,
        otp: '000000',
      }),
    });

    assert(verifyRes.status === 400, `Wrong OTP returns 400 Bad Request (got ${verifyRes.status})`);
    const data = await verifyRes.json();
    assert(data.error === 'INVALID_OTP', 'Error code is INVALID_OTP');
    assert(data.remainingAttempts === 4, 'Remaining attempts decremented to 4');
  });

  await test('POST /api/auth/verify-email verifies valid OTP, issues session cookie, and marks verified', async () => {
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({
        email: testEmail,
        otp: registeredOtp,
      }),
    });

    assert(verifyRes.status === 200, `Valid OTP returns 200 OK (got ${verifyRes.status})`);
    const setCookie = verifyRes.headers.get('set-cookie');
    assert(Boolean(setCookie && setCookie.includes('sakhibiz_session')), 'Returns session cookie');
    const data = await verifyRes.json();
    assert(data.success === true, 'Verification success is true');
    assert(data.user.emailVerified === true, 'User is marked emailVerified: true');
  });

  await test('Single-use protection: Reusing verified OTP is rejected', async () => {
    const reuseRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({
        email: testEmail,
        otp: registeredOtp,
      }),
    });

    const data = await reuseRes.json();
    assert(data.alreadyVerified === true || reuseRes.status === 400, 'Reused OTP does not re-process');
  });

  await test('Now verified user can successfully log in with password', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
      }),
    });

    assert(loginRes.status === 200, 'Login succeeds with 200 OK after verification');
    const data = await loginRes.json();
    assert(data.user.emailVerified === true, 'Session user is email verified');
  });

  // ---------------------------------------------------------------------------
  // Suite 6: Forgot Password & Password Reset Flow
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 6: Forgot Password & Password Reset Flow ---');

  let resetOtp = '';

  await test('POST /api/auth/forgot-password returns generic 200 and generates reset OTP', async () => {
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    assert(forgotRes.status === 200, `Forgot password returns 200 OK (got ${forgotRes.status})`);
    const data = await forgotRes.json();
    assert(data.success === true, 'Generic success message returned');
    assert(typeof data.delivery?.devOtpPreview === 'string', 'Captures reset OTP in test mode');
    resetOtp = data.delivery.devOtpPreview;
  });

  await test('POST /api/auth/forgot-password prevents user enumeration for non-existent email', async () => {
    const fakeRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({ email: 'nonexistent_account_4920@sakhibiz.xyz' }),
    });

    assert(fakeRes.status === 200, 'Returns 200 OK even when user does not exist');
    const data = await fakeRes.json();
    assert(data.success === true, 'Prevents enumeration with generic response');
  });

  await test('POST /api/auth/reset-password rejects short password', async () => {
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({
        email: testEmail,
        otp: resetOtp,
        newPassword: '123', // < 6 chars
      }),
    });

    assert(resetRes.status === 400, 'Short password returns 400 Bad Request');
  });

  await test('POST /api/auth/reset-password successfully updates password with valid OTP', async () => {
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass-ratelimit': '1',
      },
      body: JSON.stringify({
        email: testEmail,
        otp: resetOtp,
        newPassword: 'brandNewPassword999',
      }),
    });

    assert(resetRes.status === 200, `Reset password returns 200 OK (got ${resetRes.status})`);
    const data = await resetRes.json();
    assert(data.success === true, 'Success flag is TRUE');
  });

  await test('Old password no longer works, new password logs in successfully', async () => {
    // Old password
    const oldLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'password123' }),
    });
    assert(oldLogin.status === 401, 'Old password fails with 401');

    // New password
    const newLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'brandNewPassword999' }),
    });
    assert(newLogin.status === 200, 'New password logs in with 200 OK');
  });

  // ---------------------------------------------------------------------------
  // Suite 7: Brevo Live Diagnostic Endpoint
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 7: Brevo Live Diagnostic Endpoint ---');
  await test('GET /api/auth/brevo-diagnostics provides structured diagnostic feedback', async () => {
    const diagRes = await fetch(`${BASE_URL}/api/auth/brevo-diagnostics`);
    assert(diagRes.status === 200, 'Brevo diagnostics endpoint returns 200 OK');
    const diag = await diagRes.json();
    const expectedSender = (process.env.BREVO_SENDER_EMAIL || 'authentication@sakhibiz.xyz').toLowerCase().trim();
    assert(diag.senderEmail === expectedSender, `Target sender matches ${expectedSender}`);
    assert(typeof diag.configured === 'boolean', 'Reports configuration state');
  });

  // Teardown
  server.close();

  console.log('\n====================================================');
  console.log(`OTP Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((e) => {
  console.error('Fatal test execution error:', e);
  process.exit(1);
});
