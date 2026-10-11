import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import type { Request, Response, NextFunction } from 'express';
import { User, IUser, UserRole } from './models/User';
import { connectMongo, isMongoConfigured } from './db';

dotenv.config();

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'sakhibiz-dev-secret-key-change-in-production';
}

const COOKIE_NAME = 'sakhibiz_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  tokenPayload?: TokenPayload;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });

  return list;
}

export function extractToken(req: Request): string | null {
  // 1. From cookie-parser or raw headers
  if ((req as any).cookies && (req as any).cookies[COOKIE_NAME]) {
    return (req as any).cookies[COOKIE_NAME];
  }

  const rawCookies = parseCookies(req.headers.cookie);
  if (rawCookies[COOKIE_NAME]) {
    return rawCookies[COOKIE_NAME];
  }

  // 2. From Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export function setAuthCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  if (typeof res.cookie === 'function') {
    res.cookie(COOKIE_NAME, token, cookieOptions);
  } else {
    // Standard header setter for serverless environments
    const cookieStr = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${
      7 * 24 * 60 * 60
    }; HttpOnly; SameSite=${isProd ? 'None' : 'Lax'}${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookieStr);
  }
}

export function clearAuthCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
  } else {
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
    );
  }
}

export function normalizeAdminEmail(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.toLowerCase().trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  const emailMatch = cleaned.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && emailMatch[1]) {
    cleaned = emailMatch[1].toLowerCase().trim();
  }
  if (!cleaned.includes('@') || cleaned.length < 5) return null;
  return cleaned;
}

export function checkIsInitialAdmin(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const configuredAdmin = normalizeAdminEmail(process.env.INITIAL_ADMIN_EMAIL);
  if (!configuredAdmin) return false;
  const candidate = normalizeAdminEmail(email);
  if (!candidate) return false;
  return candidate === configuredAdmin;
}

// Middleware to verify session and enforce role requirements
export function requireAuth(allowedRoles?: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }

    req.tokenPayload = payload;

    // Check against live MongoDB if database is connected
    if (isMongoConfigured()) {
      try {
        await connectMongo();
        const user = await User.findOne({ userId: payload.userId });
        if (!user) {
          return res.status(401).json({ error: 'User account not found.' });
        }

        if (user.accountStatus === 'SUSPENDED') {
          clearAuthCookie(res);
          return res.status(403).json({
            error: 'This account has been suspended. Please contact the administrator.',
          });
        }

        // Automatic bootstrap if matching initial admin email
        if (checkIsInitialAdmin(user.normalizedEmail) && user.role !== 'ADMIN') {
          user.role = 'ADMIN';
          await user.save();
        }

        req.user = user;
        req.tokenPayload.role = user.role;
      } catch (err) {
        console.warn('DB lookup failed in auth middleware, relying on token payload:', err);
      }
    }

    const effectiveRole = req.user?.role || req.tokenPayload.role;

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(effectiveRole)) {
        return res.status(403).json({
          error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${effectiveRole}.`,
        });
      }
    }

    next();
  };
}
