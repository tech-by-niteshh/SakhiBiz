import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import coursesRouter from './routes/courses';
import adminRouter from './routes/admin';
import adminAiRouter from './routes/adminAi';
import chatHandler from '../../api/ai/chat';
import simplifyHandler from '../../api/ai/simplify-lesson';
import feedbackHandler from '../../api/feedback';
import { isMongoConfigured } from './db';
import { isSheetsConfigured } from './sheets';
import { AiKeyStore } from './ai/keyStore';

dotenv.config();

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Mount modular backend routers (dual-path for Vercel rewrite compatibility)
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/courses', '/courses'], coursesRouter);
app.use(['/api/admin/ai', '/admin/ai'], adminAiRouter);
app.use(['/api/admin', '/admin'], adminRouter);

// Preserved AI & Feedback Endpoints
app.all(['/api/ai/chat', '/ai/chat'], (req, res) => chatHandler(req as any, res as any));
app.all(['/api/ai/simplify-lesson', '/ai/simplify-lesson'], (req, res) => simplifyHandler(req as any, res as any));
app.all(['/api/feedback', '/feedback'], (req, res) => feedbackHandler(req as any, res as any));

// Gemini Live API & Video Audio Translation Session Gateway
app.post(['/api/ai/live/session', '/ai/live/session'], async (req, res) => {
  try {
    const { geminiLiveSessionManager } = await import('./ai/keyManager');
    const { targetLanguage = 'hi' } = req.body || {};
    const session = await geminiLiveSessionManager.createSession({ targetLanguage });
    return res.status(200).json({ success: true, ...session, fallbackAudio: 'hindi_original' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message, fallbackAudio: 'hindi_original' });
  }
});

app.post(['/api/ai/live/reconnect', '/ai/live/reconnect'], async (req, res) => {
  try {
    const { geminiLiveSessionManager } = await import('./ai/keyManager');
    const { sessionId, error } = req.body || {};
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
    const result = await geminiLiveSessionManager.reconnectSession(sessionId, error);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message, audioTrack: 'hindi_original' });
  }
});

// Comprehensive System Diagnostics
app.get(['/api/health', '/health'], async (req, res) => {
  const geminiConfigured = !!(
    (process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim().length > 0 &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') ||
    (await AiKeyStore.getEligibleKeys('gemini')).length > 0
  );

  const groqConfigured = !!(
    (process.env.GROQ_API_KEY &&
      process.env.GROQ_API_KEY.trim().length > 0) ||
    (await AiKeyStore.getEligibleKeys('groq')).length > 0
  );

  return res.status(200).json({
    status: 'healthy',
    platform: 'SakhiBiz Production Platform',
    services: {
      mongoAtlasConfigured: isMongoConfigured(),
      googleSheetsConfigured: isSheetsConfigured(),
      geminiAiConfigured: geminiConfigured,
      groqAiConfigured: groqConfigured,
      initialAdminConfigured: !!process.env.INITIAL_ADMIN_EMAIL,
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

export default app;
