// language: TypeScript, file: scripts/test-integration.ts, runtime: Node.js (tsx), target: Windows / CI
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../src/server/app';

const TEST_PORT = 3888;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
import { signToken } from '../src/server/auth';
import { isMongoConfigured, connectMongo } from '../src/server/db';
import { User } from '../src/server/models/User';

function makeToken(userId: string, email: string, role: 'ADMIN' | 'MODERATOR' | 'USER') {
  return signToken({ userId, email, role, name: `Test ${role}` });
}

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('SakhiBiz Real HTTP Integration Tests (Express API)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // Ensure test accounts exist in MongoDB if database is live
  if (isMongoConfigured()) {
    try {
      await connectMongo();
      await User.findOneAndUpdate(
        { normalizedEmail: 'learner@sakhibiz.org' },
        { userId: 'usr-1', email: 'learner@sakhibiz.org', normalizedEmail: 'learner@sakhibiz.org', name: 'Test USER', role: 'USER', passwordHash: 'test', accountStatus: 'ACTIVE', emailVerified: true },
        { upsert: true }
      );
      await User.findOneAndUpdate(
        { normalizedEmail: 'moderator@sakhibiz.org' },
        { userId: 'mod-1', email: 'moderator@sakhibiz.org', normalizedEmail: 'moderator@sakhibiz.org', name: 'Test MODERATOR', role: 'MODERATOR', passwordHash: 'test', accountStatus: 'ACTIVE', emailVerified: true },
        { upsert: true }
      );
      await User.findOneAndUpdate(
        { normalizedEmail: 'admin@sakhibiz.org' },
        { userId: 'adm-1', email: 'admin@sakhibiz.org', normalizedEmail: 'admin@sakhibiz.org', name: 'Test ADMIN', role: 'ADMIN', passwordHash: 'test', accountStatus: 'ACTIVE', emailVerified: true },
        { upsert: true }
      );
    } catch (e) {
      console.warn('Test user seeding skipped:', e);
    }
  }

  // Start server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, '127.0.0.1', () => resolve()));
  console.log(`Test server running at ${BASE_URL}\n`);

  try {
    // --------------------------------------------------------------------------
    // Test 1: Health & Diagnostics
    // --------------------------------------------------------------------------
    console.log('--- Suite 1: Health & Dual-Path Vercel Routing ---');
    const healthRes1 = await fetch(`${BASE_URL}/api/health`);
    assert(healthRes1.status === 200, 'GET /api/health returns 200 OK');
    const healthData1 = await healthRes1.json();
    assert(healthData1.status === 'healthy', '/api/health returns status healthy');

    const healthRes2 = await fetch(`${BASE_URL}/health`);
    assert(healthRes2.status === 200, 'GET /health returns 200 OK (Vercel rewrite parity)');

    // --------------------------------------------------------------------------
    // Test 2: Unauthenticated Access Guarding (401 Unauthorized)
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 2: Unauthenticated Access Guarding ---');
    const unauthStats = await fetch(`${BASE_URL}/api/admin/stats`);
    assert(unauthStats.status === 401, 'Unauthenticated GET /api/admin/stats returns 401');

    const unauthUsers = await fetch(`${BASE_URL}/api/admin/users`);
    assert(unauthUsers.status === 401, 'Unauthenticated GET /api/admin/users returns 401');

    const unauthCourseCreate = await fetch(`${BASE_URL}/api/admin/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Course' }),
    });
    assert(unauthCourseCreate.status === 401, 'Unauthenticated POST /api/admin/courses returns 401');

    const unauthEnroll = await fetch(`${BASE_URL}/api/courses/course-test/enroll`, {
      method: 'POST',
    });
    assert(unauthEnroll.status === 401, 'Unauthenticated POST /api/courses/:id/enroll returns 401');

    // --------------------------------------------------------------------------
    // Test 3: USER Role Enforcement
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 3: Learner (USER) Permissions ---');
    const userCookie = `sakhibiz_session=${makeToken('usr-1', 'learner@sakhibiz.org', 'USER')}`;

    const userStats = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Cookie: userCookie },
    });
    assert(userStats.status === 403, 'USER accessing /api/admin/stats is denied with 403 Forbidden');

    const userUsers = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: userCookie },
    });
    assert(userUsers.status === 403, 'USER accessing /api/admin/users is denied with 403 Forbidden');

    const userCourses = await fetch(`${BASE_URL}/api/courses`, {
      headers: { Cookie: userCookie },
    });
    assert(userCourses.status === 200, 'USER can browse public courses (GET /api/courses returns 200)');
    const coursesData = await userCourses.json();
    assert(Array.isArray(coursesData.courses) && coursesData.courses.length > 0, 'Returns non-empty course catalog');

    // --------------------------------------------------------------------------
    // Test 4: MODERATOR Role & Least-Privilege Enforcement
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 4: MODERATOR Permissions & Least Privilege ---');
    const modCookie = `sakhibiz_session=${makeToken('mod-1', 'moderator@sakhibiz.org', 'MODERATOR')}`;

    const modStats = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Cookie: modCookie },
    });
    assert(modStats.status === 200, 'MODERATOR can view permitted stats (GET /api/admin/stats returns 200)');
    const modStatsData = await modStats.json();
    assert(
      modStatsData.stats.totalRegisteredUsers === undefined,
      'Least privilege: Moderator is NOT exposed registered user totals'
    );
    assert(
      modStatsData.stats.dailyMailQuotaRemaining === undefined,
      'Least privilege: Moderator is NOT exposed daily email quotas'
    );
    assert(
      typeof modStatsData.stats.publishedCoursesCount === 'number',
      'Moderator sees permitted course and lesson counts'
    );

    const modUsers = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: modCookie },
    });
    assert(modUsers.status === 403, 'Least privilege: MODERATOR is blocked from viewing users table (403)');

    const modEmail = await fetch(`${BASE_URL}/api/admin/emails/send`, {
      method: 'POST',
      headers: { Cookie: modCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Test', body: 'Test' }),
    });
    assert(modEmail.status === 403, 'Least privilege: MODERATOR is blocked from sending email announcements (403)');

    // --------------------------------------------------------------------------
    // Test 5: ADMIN Role Privileges
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 5: ADMIN Role Privileges ---');
    const adminCookie = `sakhibiz_session=${makeToken('adm-1', 'admin@sakhibiz.org', 'ADMIN')}`;

    const adminStats = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Cookie: adminCookie },
    });
    assert(adminStats.status === 200, 'ADMIN has access to /api/admin/stats');
    const adminStatsData = await adminStats.json();
    assert(
      typeof adminStatsData.stats.totalRegisteredUsers === 'number',
      'ADMIN receives full registered user statistics'
    );

    const driveParse = await fetch(`${BASE_URL}/api/admin/drive/parse`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OGvE2upms/view' }),
    });
    assert(driveParse.status === 200, 'ADMIN can parse Google Drive URLs via /api/admin/drive/parse');
    const driveParseData = await driveParse.json();
    assert(
      driveParseData.meta.driveFileId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OGvE2upms',
      'Drive parser returns normalized file ID'
    );

    const emailValidation = await fetch(`${BASE_URL}/api/admin/emails/send`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: '', body: '' }),
    });
    assert(emailValidation.status === 400, 'Email dispatch validates subject and body requirement (returns 400)');

    // --------------------------------------------------------------------------
    // Test 6: Auth Logout Session Termination
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 6: Session Termination (Logout) ---');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: userCookie },
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
    const setCookie = logoutRes.headers.get('set-cookie');
    assert(
      !!setCookie && (setCookie.includes('sakhibiz_session=;') || setCookie.includes('Expires=Thu, 01 Jan 1970')),
      'Logout clears sakhibiz_session cookie'
    );

    // --------------------------------------------------------------------------
    // Test 7: Missing MongoDB Service Fallback Handling
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 7: Missing Service Credentials Graceful Handlers ---');
    const loginAttempt = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });
    // When MONGODB_URI is configured, returns 401 for invalid credentials; when unconfigured, returns 503
    if (isMongoConfigured()) {
      assert(
        loginAttempt.status === 401,
        'POST /api/auth/login gracefully returns 401 for invalid credentials when MONGODB_URI is configured'
      );
    } else {
      assert(
        loginAttempt.status === 503,
        'POST /api/auth/login gracefully returns 503 when MONGODB_URI is unconfigured'
      );
    }

    console.log('\n====================================================');
    console.log(`Integration Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');
  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runIntegrationTests().catch((err) => {
  console.error('Integration test runner failure:', err);
  process.exit(1);
});
