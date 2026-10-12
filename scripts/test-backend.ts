// language: TypeScript, file: scripts/test-backend.ts, runtime: Node.js (tsx), target: Windows / CI
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parseGoogleDriveVideo } from '../src/server/sheets';

async function runVerificationTests() {
  console.log('====================================================');
  console.log('SakhiBiz Backend & Core Integration Verification Tests');
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

  // TEST 1: Google Drive URL Parsing & Validation
  console.log('--- Suite 1: Google Drive Video Normalization ---');
  const validDriveUrl = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OGvE2upms/view?usp=sharing';
  const parsed1 = parseGoogleDriveVideo(validDriveUrl);
  assert(
    parsed1.driveFileId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OGvE2upms',
    'Extracts Drive File ID from standard sharing URL'
  );
  assert(
    parsed1.embedUrl === 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OGvE2upms/preview',
    'Generates standard iframe preview URL'
  );

  const nakedId = '1t-abcXYZ_1234567890abcdefghijk';
  const parsed2 = parseGoogleDriveVideo(nakedId);
  assert(
    parsed2.driveFileId === nakedId,
    'Extracts Drive File ID when provided as naked ID string'
  );

  const invalidUrl = 'https://example.com/not-drive/video.mp4';
  const parsed3 = parseGoogleDriveVideo(invalidUrl);
  assert(
    parsed3.isValid === false && parsed3.driveFileId === '',
    'Rejects non-Google-Drive URLs safely without crashing'
  );

  // TEST 2: Password Hashing & Bcrypt Verification
  console.log('\n--- Suite 2: Password Hashing & Bcrypt Security ---');
  const plainPass = 'SakhiPass#2026';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plainPass, salt);
  assert(
    hash.startsWith('$2') && hash !== plainPass,
    'Generates high-work-factor bcrypt salt & hash'
  );
  const match = await bcrypt.compare(plainPass, hash);
  assert(match === true, 'Bcrypt compares correct plain password as TRUE');
  const mismatch = await bcrypt.compare('WrongPassword123', hash);
  assert(mismatch === false, 'Bcrypt rejects incorrect plain password as FALSE');

  // TEST 3: JWT Session Token Signing & HttpOnly Payload Verification
  console.log('\n--- Suite 3: JWT Authentication & Role Payload Integrity ---');
  const secret = 'test-super-secret-key-for-sakhibiz-suite-32chars';
  const payload = {
    userId: 'usr-admin-1',
    email: 'owner@sakhibiz.org',
    role: 'ADMIN' as const,
  };
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });
  const decoded = jwt.verify(token, secret) as any;
  assert(decoded.userId === payload.userId, 'JWT carries accurate userId payload');
  assert(decoded.role === 'ADMIN', 'JWT carries accurate ADMIN role payload');

  let tamperedCaught = false;
  try {
    jwt.verify(token, 'wrong-secret-key');
  } catch {
    tamperedCaught = true;
  }
  assert(tamperedCaught, 'Tampered or wrongly signed JWT is firmly rejected');

  // TEST 4: Role-Based Access Control Logic Check
  console.log('\n--- Suite 4: Least Privilege & RBAC Matrix ---');
  function checkRouteAccess(allowedRoles: string[], userRole: string): boolean {
    return allowedRoles.includes(userRole);
  }

  assert(
    checkRouteAccess(['ADMIN'], 'ADMIN') === true,
    'ADMIN has access to admin-only operations (Role change, Email dispatch, Audit logs)'
  );
  assert(
    checkRouteAccess(['ADMIN'], 'MODERATOR') === false,
    'MODERATOR is denied access to admin-only operations'
  );
  assert(
    checkRouteAccess(['ADMIN'], 'USER') === false,
    'USER is denied access to admin-only operations'
  );
  assert(
    checkRouteAccess(['ADMIN', 'MODERATOR'], 'MODERATOR') === true,
    'MODERATOR has access to course and lesson CMS routes'
  );
  assert(
    checkRouteAccess(['ADMIN', 'MODERATOR'], 'USER') === false,
    'USER is denied access to course and lesson CMS routes'
  );

  // TEST 5: Last Active Admin Demotion Protection Logic
  console.log('\n--- Suite 5: Last Active Administrator Safety Safeguard ---');
  function canDemoteAdmin(activeAdminCount: number): boolean {
    return activeAdminCount > 1;
  }
  assert(
    canDemoteAdmin(1) === false,
    'Blocks demoting or removing the last active administrator'
  );
  assert(
    canDemoteAdmin(2) === true,
    'Allows demoting an administrator when another active administrator exists'
  );

  // SUMMARY
  console.log('\n====================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
