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

const router = Router();

// Register a new learner or bootstrap admin
router.post('/register', async (req: Request, res: Response) => {
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
        error:
          'MongoDB Atlas is not configured. Please supply MONGODB_URI in your environment variables.',
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

    const newUser = await User.create({
      userId,
      normalizedEmail,
      passwordHash,
      name: name.trim(),
      role,
      accountStatus: 'ACTIVE',
      emailVerified: false,
      businessCategory: businessCategory || 'textiles_tailoring',
      businessStage: 'starting',
      location: location || 'India',
      language: ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'].includes(language) ? language : 'hi',
      sheetsSynced: false,
      lastLoginAt: new Date(),
    });

    // Synchronize to Google Sheets Users tab asynchronously (durable pending check)
    if (SheetsClient.isConfigured()) {
      SheetsClient.syncUser({
        userId,
        normalizedEmail,
        registeredAt: newUser.createdAt.toISOString(),
        accountStatus: 'ACTIVE',
        emailVerified: false,
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

    // Generate JWT and set secure HttpOnly cookie
    const token = signToken({
      userId: newUser.userId,
      email: newUser.normalizedEmail,
      role: newUser.role,
      name: newUser.name,
    });
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      user: {
        userId: newUser.userId,
        email: newUser.normalizedEmail,
        name: newUser.name,
        role: newUser.role,
        accountStatus: newUser.accountStatus,
        emailVerified: newUser.emailVerified,
        businessCategory: newUser.businessCategory,
        businessStage: newUser.businessStage,
        location: newUser.location,
        language: newUser.language,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Registration failure:', err?.message || err);
    return res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
});

// Login with email and password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isMongoConfigured()) {
      return res.status(503).json({
        error:
          'MongoDB Atlas is not configured. Please supply MONGODB_URI in your environment variables.',
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

    // Bootstrap check
    if (checkIsInitialAdmin(normalizedEmail) && user.role !== 'ADMIN') {
      user.role = 'ADMIN';
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
      user: {
        userId: user.userId,
        email: user.normalizedEmail,
        name: user.name,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        businessCategory: user.businessCategory,
        businessStage: user.businessStage,
        location: user.location,
        language: user.language,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Login failure:', err?.message || err);
    return res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// Get current session
router.get('/me', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const payload = req.tokenPayload!;

  if (user) {
    return res.status(200).json({
      user: {
        userId: user.userId,
        email: user.normalizedEmail,
        name: user.name,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        businessCategory: user.businessCategory,
        businessStage: user.businessStage,
        location: user.location,
        language: user.language,
        createdAt: user.createdAt,
      },
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
      emailVerified: false,
      businessCategory: 'textiles_tailoring',
      businessStage: 'starting',
      location: 'India',
      language: 'hi',
    },
  });
});

// Update profile
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
      user: {
        userId: user.userId,
        email: user.normalizedEmail,
        name: user.name,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        businessCategory: user.businessCategory,
        businessStage: user.businessStage,
        location: user.location,
        language: user.language,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update profile.' });
  }
});

export default router;
