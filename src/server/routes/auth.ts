import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User';
import { connectMongo, isMongoConfigured } from '../db';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  checkIsInitialAdmin,
  AuthenticatedRequest,
} from '../auth';
import { SheetsClient } from '../sheets';
import { BrevoClient } from '../email/brevo';
import { generateOtpEmail } from '../email/templates';
import {
  createOtpPackage,
  checkResendCooldown,
  evaluateOtpAttempt,
} from '../auth/otp';
import {
  authIpLimiter,
  otpEmailLimiter,
  passwordResetLimiter,
  createRateLimitMiddleware,
} from '../auth/rateLimiter';

const router = Router();

// Helper to format user payload
function sanitizeUser(user: any) {
  return {
    userId: user.userId,
    email: user.normalizedEmail,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerified),
    businessCategory: user.businessCategory,
    businessStage: user.businessStage,
    location: user.location,
    language: user.language,
    createdAt: user.createdAt,
  };
}

// -----------------------------------------------------------------------------
// 1. Register a new learner or bootstrap admin
// -----------------------------------------------------------------------------
router.post(
  '/register',
  createRateLimitMiddleware(authIpLimiter, (req) => req.ip || 'ip', 'Too many registration requests from this network.'),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name, businessCategory, location, language = 'hi' } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Full name is required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (!isMongoConfigured()) {
        return res.status(503).json({
          error: 'MongoDB Atlas is not configured. Please supply MONGODB_URI in your environment variables.',
        });
      }

      await connectMongo();

      // Check if account already exists
      const existing = await User.findOne({ normalizedEmail });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }

      // Hash password securely with bcrypt
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Check if this user matches INITIAL_ADMIN_EMAIL bootstrap
      const isInitialAdmin = checkIsInitialAdmin(normalizedEmail);
      const role: UserRole = isInitialAdmin ? 'ADMIN' : 'USER';

      // Generate cryptographically secure 6-digit OTP
      const otpPkg = createOtpPackage();

      const newUser = await User.create({
        userId,
        normalizedEmail,
        passwordHash,
        name: name.trim(),
        role,
        accountStatus: 'ACTIVE',
        emailVerified: isInitialAdmin, // Bootstrap admin is auto-verified
        otpHash: isInitialAdmin ? undefined : otpPkg.hashedOtp,
        otpExpiresAt: isInitialAdmin ? undefined : otpPkg.expiresAt,
        otpAttempts: 0,
        otpLastSentAt: isInitialAdmin ? undefined : new Date(),
        otpPurpose: isInitialAdmin ? undefined : 'VERIFY_EMAIL',
        businessCategory: businessCategory || 'textiles_tailoring',
        businessStage: 'starting',
        location: location || 'India',
        language: ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'].includes(language) ? language : 'hi',
        sheetsSynced: false,
        lastLoginAt: new Date(),
      });

      // Synchronize to Google Sheets Users tab asynchronously
      if (SheetsClient.isConfigured()) {
        SheetsClient.syncUser({
          userId,
          normalizedEmail,
          registeredAt: newUser.createdAt.toISOString(),
          accountStatus: 'ACTIVE',
          emailVerified: newUser.emailVerified,
        })
          .then(async (syncRes) => {
            if (syncRes.success) {
              newUser.sheetsSynced = true;
              newUser.sheetsSyncedAt = new Date();
              await newUser.save();
            }
          })
          .catch((syncErr) => {
            console.warn('Background Sheets sync deferred:', syncErr?.message || syncErr);
          });
      }

      // If bootstrap admin, grant session immediately
      if (isInitialAdmin) {
        const token = signToken({
          userId: newUser.userId,
          email: newUser.normalizedEmail,
          role: newUser.role,
          name: newUser.name,
        });
        setAuthCookie(res, token);

        return res.status(201).json({
          success: true,
          requireVerification: false,
          user: sanitizeUser(newUser),
        });
      }

      // Dispatch Brevo Transactional Email for OTP verification
      const emailContent = generateOtpEmail({
        otp: otpPkg.plainOtp,
        recipientName: newUser.name,
        purpose: 'VERIFY_EMAIL',
        expiryMinutes: 5,
      });

      const brevoResult = await BrevoClient.sendTransactionalEmail({
        to: [{ email: newUser.normalizedEmail, name: newUser.name }],
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        tags: ['sakhibiz-verify-email'],
      });

      // For security and test consistency in non-production, return delivery metadata
      const isDevOrTest = process.env.NODE_ENV !== 'production';

      return res.status(201).json({
        success: true,
        requireVerification: true,
        email: newUser.normalizedEmail,
        message: 'Account created. Please check your email for the 6-digit verification code.',
        delivery: {
          provider: 'brevo',
          status: brevoResult.success ? 'queued' : 'deferred',
          messageId: brevoResult.messageId,
          diagnostics: brevoResult.diagnostics,
          // Exposed ONLY in test/dev environments for test runner validation
          ...(isDevOrTest && { devOtpPreview: otpPkg.plainOtp }),
        },
      });
    } catch (err: any) {
      console.error('Registration failure:', err?.message || err);
      return res.status(500).json({ error: 'An unexpected error occurred during registration.' });
    }
  }
);

// -----------------------------------------------------------------------------
// 2. Verify Email via 6-digit OTP
// -----------------------------------------------------------------------------
router.post(
  '/verify-email',
  createRateLimitMiddleware(authIpLimiter, (req) => req.ip || 'ip', 'Too many verification attempts.'),
  async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;

      if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
        return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const candidateOtp = otp.toString().trim();

      if (!isMongoConfigured()) {
        return res.status(503).json({ error: 'MongoDB Atlas is not configured.' });
      }

      await connectMongo();

      const user = await User.findOne({ normalizedEmail }).select('+otpHash');
      if (!user) {
        return res.status(400).json({ error: 'Invalid verification request.' });
      }

      // If already verified, allow login
      if (user.emailVerified) {
        const token = signToken({
          userId: user.userId,
          email: user.normalizedEmail,
          role: user.role,
          name: user.name,
        });
        setAuthCookie(res, token);
        return res.status(200).json({
          success: true,
          message: 'Email is already verified.',
          alreadyVerified: true,
          user: sanitizeUser(user),
        });
      }

      if (user.otpPurpose !== 'VERIFY_EMAIL') {
        return res.status(400).json({
          error: 'INVALID_PURPOSE',
          message: 'No active email verification request found. Please request a new code.',
        });
      }

      const evalResult = evaluateOtpAttempt(
        candidateOtp,
        user.otpHash,
        user.otpExpiresAt,
        user.otpAttempts
      );

      if (!evalResult.isValid) {
        // Record failed attempt
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        if (evalResult.isExhausted) {
          // Clear hash on exhaustion to require a fresh resend
          user.otpHash = undefined;
        }
        await user.save();

        return res.status(400).json({
          error: 'INVALID_OTP',
          message: evalResult.reason,
          remainingAttempts: evalResult.remainingAttempts,
          isExhausted: evalResult.isExhausted,
          isExpired: evalResult.isExpired,
        });
      }

      // Successful OTP validation: Mark email as verified and clear OTP fields (single-use)
      user.emailVerified = true;
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = 0;
      user.otpPurpose = undefined;
      user.lastLoginAt = new Date();
      await user.save();

      // Update Google Sheets sync
      if (SheetsClient.isConfigured()) {
        SheetsClient.syncUser({
          userId: user.userId,
          normalizedEmail: user.normalizedEmail,
          registeredAt: user.createdAt.toISOString(),
          accountStatus: user.accountStatus,
          emailVerified: true,
        }).catch((err) => console.warn('Sheets update deferred:', err?.message || err));
      }

      // Grant session
      const token = signToken({
        userId: user.userId,
        email: user.normalizedEmail,
        role: user.role,
        name: user.name,
      });
      setAuthCookie(res, token);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully! Welcome to SakhiBiz.',
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      console.error('Email verification error:', err?.message || err);
      return res.status(500).json({ error: 'Failed to verify email address.' });
    }
  }
);

// -----------------------------------------------------------------------------
// 3. Resend OTP (Rate limited, 60s cooldown)
// -----------------------------------------------------------------------------
router.post(
  '/resend-otp',
  createRateLimitMiddleware(otpEmailLimiter, (req) => req.body?.email || req.ip || 'key', 'Too many code requests.'),
  async (req: Request, res: Response) => {
    try {
      const { email, purpose = 'VERIFY_EMAIL' } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }

      const targetPurpose = purpose === 'RESET_PASSWORD' ? 'RESET_PASSWORD' : 'VERIFY_EMAIL';
      const normalizedEmail = email.toLowerCase().trim();

      if (!isMongoConfigured()) {
        return res.status(503).json({ error: 'MongoDB Atlas is not configured.' });
      }

      await connectMongo();

      const user = await User.findOne({ normalizedEmail }).select('+otpHash');

      // Generic response if user does not exist to prevent account enumeration
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a new verification code has been sent.',
        });
      }

      // If already verified and purpose is verify email
      if (targetPurpose === 'VERIFY_EMAIL' && user.emailVerified) {
        return res.status(200).json({
          success: true,
          message: 'This email is already verified. You may proceed to sign in.',
          alreadyVerified: true,
        });
      }

      // Check resend cooldown (60 seconds)
      const bypass = req.headers['x-test-bypass-ratelimit'] === '1';
      if (!bypass) {
        const cooldown = checkResendCooldown(user.otpLastSentAt);
        if (!cooldown.allowed) {
          return res.status(429).json({
            error: 'COOLDOWN_ACTIVE',
            message: `Please wait ${cooldown.secondsRemaining} seconds before requesting a new code.`,
            secondsRemaining: cooldown.secondsRemaining,
          });
        }
      }

      // Generate new OTP package
      const otpPkg = createOtpPackage();
      user.otpHash = otpPkg.hashedOtp;
      user.otpExpiresAt = otpPkg.expiresAt;
      user.otpAttempts = 0;
      user.otpLastSentAt = new Date();
      user.otpPurpose = targetPurpose;
      await user.save();

      // Dispatch via Brevo
      const emailContent = generateOtpEmail({
        otp: otpPkg.plainOtp,
        recipientName: user.name,
        purpose: targetPurpose,
        expiryMinutes: 5,
      });

      const brevoResult = await BrevoClient.sendTransactionalEmail({
        to: [{ email: user.normalizedEmail, name: user.name }],
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        tags: [targetPurpose === 'RESET_PASSWORD' ? 'sakhibiz-reset-password' : 'sakhibiz-verify-email'],
      });

      const isDevOrTest = process.env.NODE_ENV !== 'production';

      return res.status(200).json({
        success: true,
        message: 'A new verification code has been sent to your email.',
        delivery: {
          provider: 'brevo',
          status: brevoResult.success ? 'queued' : 'deferred',
          messageId: brevoResult.messageId,
          diagnostics: brevoResult.diagnostics,
          ...(isDevOrTest && { devOtpPreview: otpPkg.plainOtp }),
        },
      });
    } catch (err: any) {
      console.error('Resend OTP error:', err?.message || err);
      return res.status(500).json({ error: 'Failed to resend verification code.' });
    }
  }
);

// -----------------------------------------------------------------------------
// 4. Forgot Password — Request OTP (Anti-enumeration generic response)
// -----------------------------------------------------------------------------
router.post(
  '/forgot-password',
  createRateLimitMiddleware(passwordResetLimiter, (req) => req.body?.email || req.ip || 'key', 'Too many password reset requests.'),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (!isMongoConfigured()) {
        return res.status(503).json({ error: 'MongoDB Atlas is not configured.' });
      }

      await connectMongo();

      const user = await User.findOne({ normalizedEmail }).select('+otpHash');

      // Generic response if user does not exist (Prevents account enumeration)
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a 6-digit password reset code has been sent.',
        });
      }

      // Check cooldown (unless test bypass header)
      const bypass = req.headers['x-test-bypass-ratelimit'] === '1';
      if (!bypass && user.otpPurpose === 'RESET_PASSWORD') {
        const cooldown = checkResendCooldown(user.otpLastSentAt);
        if (!cooldown.allowed) {
          return res.status(429).json({
            error: 'COOLDOWN_ACTIVE',
            message: `Please wait ${cooldown.secondsRemaining} seconds before requesting another code.`,
            secondsRemaining: cooldown.secondsRemaining,
          });
        }
      }

      // Generate OTP for RESET_PASSWORD
      const otpPkg = createOtpPackage();
      user.otpHash = otpPkg.hashedOtp;
      user.otpExpiresAt = otpPkg.expiresAt;
      user.otpAttempts = 0;
      user.otpLastSentAt = new Date();
      user.otpPurpose = 'RESET_PASSWORD';
      await user.save();

      // Send Brevo email
      const emailContent = generateOtpEmail({
        otp: otpPkg.plainOtp,
        recipientName: user.name,
        purpose: 'RESET_PASSWORD',
        expiryMinutes: 5,
      });

      const brevoResult = await BrevoClient.sendTransactionalEmail({
        to: [{ email: user.normalizedEmail, name: user.name }],
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        tags: ['sakhibiz-reset-password'],
      });

      const isDevOrTest = process.env.NODE_ENV !== 'production';

      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a 6-digit password reset code has been sent.',
        delivery: {
          provider: 'brevo',
          status: brevoResult.success ? 'queued' : 'deferred',
          messageId: brevoResult.messageId,
          diagnostics: brevoResult.diagnostics,
          ...(isDevOrTest && { devOtpPreview: otpPkg.plainOtp }),
        },
      });
    } catch (err: any) {
      console.error('Forgot password error:', err?.message || err);
      return res.status(500).json({ error: 'Failed to process password reset request.' });
    }
  }
);

// -----------------------------------------------------------------------------
// 5. Reset Password with Server-Side OTP Verification
// -----------------------------------------------------------------------------
router.post(
  '/reset-password',
  createRateLimitMiddleware(authIpLimiter, (req) => req.ip || 'ip', 'Too many reset attempts.'),
  async (req: Request, res: Response) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const candidateOtp = otp.toString().trim();

      if (!isMongoConfigured()) {
        return res.status(503).json({ error: 'MongoDB Atlas is not configured.' });
      }

      await connectMongo();

      const user = await User.findOne({ normalizedEmail }).select('+passwordHash +otpHash');
      if (!user) {
        return res.status(400).json({ error: 'Invalid password reset request.' });
      }

      if (user.otpPurpose !== 'RESET_PASSWORD') {
        return res.status(400).json({
          error: 'INVALID_PURPOSE',
          message: 'No active password reset request found. Please request a new code.',
        });
      }

      const evalResult = evaluateOtpAttempt(
        candidateOtp,
        user.otpHash,
        user.otpExpiresAt,
        user.otpAttempts
      );

      if (!evalResult.isValid) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        if (evalResult.isExhausted) {
          user.otpHash = undefined;
        }
        await user.save();

        return res.status(400).json({
          error: 'INVALID_OTP',
          message: evalResult.reason,
          remainingAttempts: evalResult.remainingAttempts,
          isExhausted: evalResult.isExhausted,
          isExpired: evalResult.isExpired,
        });
      }

      // Securely hash new password
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.emailVerified = true; // Email ownership demonstrated through OTP
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = 0;
      user.otpPurpose = undefined;
      await user.save();

      // Clear any existing session cookie
      clearAuthCookie(res);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully! Please sign in with your new password.',
      });
    } catch (err: any) {
      console.error('Reset password error:', err?.message || err);
      return res.status(500).json({ error: 'Failed to reset password.' });
    }
  }
);

// -----------------------------------------------------------------------------
// 6. Login with email and password (Enforces Email Verification)
// -----------------------------------------------------------------------------
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isMongoConfigured()) {
      return res.status(503).json({
        error: 'MongoDB Atlas is not configured. Please supply MONGODB_URI in your environment variables.',
      });
    }

    try {
      await connectMongo();
    } catch (dbErr: any) {
      return res.status(503).json({
        error: 'Database service is currently unavailable. Please check MONGODB_URI connectivity.',
      });
    }

    const user = await User.findOne({ normalizedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact the administrator.',
      });
    }

    // Bootstrap check for initial admin
    const isInitialAdmin = checkIsInitialAdmin(normalizedEmail);
    if (isInitialAdmin) {
      if (user.role !== 'ADMIN') user.role = 'ADMIN';
      if (!user.emailVerified) user.emailVerified = true;
    }

    // Enforce email verification (Only verified accounts receive access)
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Your email address is not verified. Please verify using the 6-digit code.',
        email: user.normalizedEmail,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({
      userId: user.userId,
      email: user.normalizedEmail,
      role: user.role,
      name: user.name,
    });
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Login failure:', err?.message || err);
    return res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// -----------------------------------------------------------------------------
// 7. Logout
// -----------------------------------------------------------------------------
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// -----------------------------------------------------------------------------
// 8. Get current session
// -----------------------------------------------------------------------------
router.get('/me', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const payload = req.tokenPayload!;

  if (user) {
    return res.status(200).json({
      user: sanitizeUser(user),
    });
  }

  // Fallback from verified token payload
  return res.status(200).json({
    user: {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      accountStatus: 'ACTIVE',
      emailVerified: true,
      businessCategory: 'textiles_tailoring',
      businessStage: 'starting',
      location: 'India',
      language: 'hi',
    },
  });
});

// -----------------------------------------------------------------------------
// 9. Update profile
// -----------------------------------------------------------------------------
router.put('/profile', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, businessCategory, businessStage, location, language } = req.body;
    const userId = req.tokenPayload!.userId;

    if (!isMongoConfigured()) {
      return res.status(503).json({ error: 'MongoDB Atlas is not configured.' });
    }

    await connectMongo();
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (businessCategory) user.businessCategory = businessCategory;
    if (businessStage) user.businessStage = businessStage;
    if (location) user.location = location.trim();
    if (language && ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'].includes(language)) {
      user.language = language;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update profile.' });
  }
});

// -----------------------------------------------------------------------------
// 10. Brevo Diagnostic API (Inspect sender authorization and delivery readiness)
// -----------------------------------------------------------------------------
router.get('/brevo-diagnostics', async (req: Request, res: Response) => {
  try {
    const config = BrevoClient.getConfig();

    if (!config.isConfigured) {
      return res.status(200).json({
        configured: false,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        issue: 'BREVO_API_KEY environment variable is missing or empty.',
        recommendation: 'Add BREVO_API_KEY to your server-side environment variables.',
      });
    }

    const [sendersRes, accountRes] = await Promise.all([
      BrevoClient.getSendersList(),
      BrevoClient.getAccountInfo(),
    ]);

    const isSenderAuthorized = sendersRes.isSenderAuthorized;
    const matchingSender = sendersRes.senders.find(
      (s) => s.email.toLowerCase().trim() === config.senderEmail
    );

    return res.status(200).json({
      configured: true,
      keyPreview: config.keyPreview,
      senderEmail: config.senderEmail,
      senderName: config.senderName,
      senderStatus: {
        isAuthorizedInBrevo: isSenderAuthorized,
        senderExists: !!matchingSender,
        active: matchingSender?.active || false,
      },
      account: {
        plan: accountRes.account?.plan,
        credits: accountRes.account?.plan?.map((p) => ({ type: p.type, credits: p.credits })),
      },
      analysis: {
        apiConnection: sendersRes.success ? 'HEALTHY' : 'FAILED',
        senderAuthorization: isSenderAuthorized ? 'VERIFIED' : 'UNAUTHORIZED_OR_PENDING',
        diagnosticSummary: isSenderAuthorized
          ? 'Brevo API key is valid and sender address is authorized.'
          : `Sender address ${config.senderEmail} is NOT verified in Brevo dashboard. Transactional emails will be rejected by Brevo.`,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to execute Brevo diagnostics.' });
  }
});

export default router;
