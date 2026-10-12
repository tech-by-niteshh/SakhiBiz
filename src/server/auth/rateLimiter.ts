import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class MemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();

  constructor(
    private windowMs: number,
    private maxRequests: number,
    private keyPrefix: string = 'rl'
  ) {
    // Periodic garbage collection every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  private getKey(identifier: string): string {
    return `${this.keyPrefix}:${identifier.toLowerCase().trim()}`;
  }

  public check(identifier: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
    const key = this.getKey(identifier);
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || now >= record.resetAt) {
      this.records.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetInSeconds: Math.ceil(this.windowMs / 1000) };
    }

    if (record.count >= this.maxRequests) {
      const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      return { allowed: false, remaining: 0, resetInSeconds };
    }

    record.count += 1;
    const remaining = this.maxRequests - record.count;
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: true, remaining, resetInSeconds };
  }

  public reset(identifier: string): void {
    this.records.delete(this.getKey(identifier));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetAt) {
        this.records.delete(key);
      }
    }
  }
}

// 1. IP rate limiter for auth endpoints (max 20 requests per 5 minutes)
export const authIpLimiter = new MemoryRateLimiter(5 * 60 * 1000, 20, 'auth_ip');

// 2. Strict OTP request limiter per email (max 5 OTP dispatches per 10 minutes)
export const otpEmailLimiter = new MemoryRateLimiter(10 * 60 * 1000, 5, 'otp_email');

// 3. Strict password reset limiter per email (max 4 attempts per 15 minutes)
export const passwordResetLimiter = new MemoryRateLimiter(15 * 60 * 1000, 4, 'pw_reset');

export function createRateLimitMiddleware(
  limiter: MemoryRateLimiter,
  keyExtractor: (req: Request) => string,
  errorMessage = 'Too many requests. Please slow down and try again later.'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // In local development or test runner, be permissive if headers specify test bypass
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-bypass-ratelimit']) {
      return next();
    }

    const key = keyExtractor(req);
    const { allowed, remaining, resetInSeconds } = limiter.check(key);

    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetInSeconds.toString());

    if (!allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `${errorMessage} (Retry in ${resetInSeconds}s)`,
        retryAfterSeconds: resetInSeconds,
      });
    }

    next();
  };
}
