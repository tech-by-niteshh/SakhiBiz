import crypto from 'crypto';
import { getJwtSecret } from '../auth';

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRATION_MS: 5 * 60 * 1000, // 5 minutes
  COOLDOWN_MS: 60 * 1000, // 60 seconds
  MAX_ATTEMPTS: 5,
};

export interface OtpGenerationResult {
  plainOtp: string;
  hashedOtp: string;
  expiresAt: Date;
  cooldownUntil: Date;
}

export interface OtpVerificationStatus {
  isValid: boolean;
  isExpired: boolean;
  isExhausted: boolean;
  remainingAttempts: number;
  reason?: string;
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateSecureOtp(): string {
  // crypto.randomInt is cryptographically strong (uses CSPRNG)
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Hash an OTP using HMAC-SHA256 with server-side secret
 * Never store plaintext OTPs in the database!
 */
export function hashOtp(otp: string): string {
  const secret = getJwtSecret();
  return crypto.createHmac('sha256', secret).update(otp.trim()).digest('hex');
}

/**
 * Compare candidate OTP against stored hash using constant-time comparison
 */
export function verifyOtpHash(candidateOtp: string, storedHash?: string): boolean {
  if (!candidateOtp || !storedHash) return false;
  const candidateHash = hashOtp(candidateOtp);
  try {
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Helper to prepare a new OTP package for saving
 */
export function createOtpPackage(): OtpGenerationResult {
  const plainOtp = generateSecureOtp();
  const hashedOtp = hashOtp(plainOtp);
  const now = Date.now();

  return {
    plainOtp,
    hashedOtp,
    expiresAt: new Date(now + OTP_CONFIG.EXPIRATION_MS),
    cooldownUntil: new Date(now + OTP_CONFIG.COOLDOWN_MS),
  };
}

/**
 * Check if resend cooldown has elapsed
 */
export function checkResendCooldown(lastSentAt?: Date): {
  allowed: boolean;
  secondsRemaining: number;
} {
  if (!lastSentAt) {
    return { allowed: true, secondsRemaining: 0 };
  }

  const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
  if (elapsedMs >= OTP_CONFIG.COOLDOWN_MS) {
    return { allowed: true, secondsRemaining: 0 };
  }

  const secondsRemaining = Math.ceil((OTP_CONFIG.COOLDOWN_MS - elapsedMs) / 1000);
  return { allowed: false, secondsRemaining };
}

/**
 * Verify an OTP submission against expiration and attempt limits
 */
export function evaluateOtpAttempt(
  candidateOtp: string,
  storedHash?: string,
  expiresAt?: Date,
  currentAttempts = 0
): OtpVerificationStatus {
  const attempts = currentAttempts || 0;

  // 1. Check if max attempts already exceeded
  if (attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    return {
      isValid: false,
      isExpired: false,
      isExhausted: true,
      remainingAttempts: 0,
      reason: 'Maximum verification attempts exceeded. Please request a new code.',
    };
  }

  // 2. Check if expired
  if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) {
    return {
      isValid: false,
      isExpired: true,
      isExhausted: false,
      remainingAttempts: Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - attempts),
      reason: 'The verification code has expired. Please request a new code.',
    };
  }

  // 3. Constant-time comparison
  const isMatch = verifyOtpHash(candidateOtp, storedHash);
  if (isMatch) {
    return {
      isValid: true,
      isExpired: false,
      isExhausted: false,
      remainingAttempts: OTP_CONFIG.MAX_ATTEMPTS - attempts,
    };
  }

  // 4. Mismatch
  const newAttempts = attempts + 1;
  const remaining = Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - newAttempts);
  return {
    isValid: false,
    isExpired: false,
    isExhausted: newAttempts >= OTP_CONFIG.MAX_ATTEMPTS,
    remainingAttempts: remaining,
    reason:
      remaining > 0
        ? `Incorrect code. ${remaining} attempt(s) remaining.`
        : 'Maximum attempts exceeded. Please request a new verification code.',
  };
}
