import { Router, Response } from 'express';
import { User, UserRole } from '../models/User';
import { ActivityLog } from '../models/ActivityLog';
import { connectMongo, isMongoConfigured } from '../db';
import { requireAuth, AuthenticatedRequest } from '../auth';
import { SheetsClient, parseGoogleDriveVideo, isSheetsConfigured } from '../sheets';

const router = Router();

// ==============================================================================
// 1. STATS & DASHBOARD OVERVIEW (Admin & Moderator)
// ==============================================================================
router.get('/stats', requireAuth(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let mongoStats = {
      totalUsers: 0,
      activeUsers: 0,
      suspendedUsers: 0,
      verifiedUsers: 0,
      adminCount: 0,
      moderatorCount: 0,
    };

    if (isMongoConfigured()) {
      try {
        await connectMongo();
        const [total, active, suspended, verified, admins, mods] = await Promise.all([
          User.countDocuments(),
          User.countDocuments({ accountStatus: 'ACTIVE' }),
          User.countDocuments({ accountStatus: 'SUSPENDED' }),
          User.countDocuments({ emailVerified: true }),
          User.countDocuments({ role: 'ADMIN' }),
          User.countDocuments({ role: 'MODERATOR' }),
        ]);

        mongoStats = {
          totalUsers: total,
          activeUsers: active,
          suspendedUsers: suspended,
          verifiedUsers: verified,
          adminCount: admins,
          moderatorCount: mods,
        };
      } catch (dbErr) {
        console.warn('MongoDB stats query deferred to fallback stats:', dbErr);
      }
    }

    const sheetsStats = SheetsClient.isConfigured() ? await SheetsClient.getStats() : null;
    const isModerator = req.tokenPayload!.role === 'MODERATOR';

    const statsPayload = isModerator
      ? {
          totalRegisteredUsers: undefined,
          activeUsers: undefined,
          suspendedUsers: undefined,
          verifiedUsers: undefined,
          adminCount: undefined,
          moderatorCount: undefined,
          publishedCoursesCount: sheetsStats?.totalCourses || 4,
          totalLessonsCount: sheetsStats?.totalLessons || 12,
          totalEnrollments: sheetsStats?.totalEnrollments || 0,
          dailyMailQuotaRemaining: undefined,
        }
      : {
          totalRegisteredUsers: mongoStats.totalUsers,
          activeUsers: mongoStats.activeUsers,
          suspendedUsers: mongoStats.suspendedUsers,
          verifiedUsers: mongoStats.verifiedUsers,
          adminCount: mongoStats.adminCount,
          moderatorCount: mongoStats.moderatorCount,
          publishedCoursesCount: sheetsStats?.totalCourses || 4,
          totalLessonsCount: sheetsStats?.totalLessons || 12,
          totalEnrollments: sheetsStats?.totalEnrollments || 0,
          dailyMailQuotaRemaining: sheetsStats?.dailyMailQuotaRemaining ?? 'N/A',
        };

    return res.status(200).json({
      success: true,
      userRole: req.tokenPayload!.role,
      mongoConnected: isMongoConfigured(),
      sheetsConnected: SheetsClient.isConfigured(),
      geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      stats: statsPayload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch admin stats.' });
  }
});

// ==============================================================================
// 2. COURSE & LESSON MANAGEMENT (Admin & Moderator)
// ==============================================================================
router.get('/courses', requireAuth(['ADMIN', 'MODERATOR']), async (_req, res: Response) => {
  try {
    const courses = await SheetsClient.listCourses(true);
    return res.status(200).json({ success: true, courses });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to list courses.' });
  }
});

router.post('/courses', requireAuth(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, category, language, thumbnailUrl, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Course title is required.' });

    const actor = req.tokenPayload!;
    const courseId = `CRS-${Date.now()}`;

    const result = await SheetsClient.createCourse({
      courseId,
      title,
      description: description || '',
      category: category || 'pricing_profit',
      language: language || 'hi',
      thumbnailUrl: thumbnailUrl || '',
      published: published !== undefined ? !!published : true,
      createdBy: `${actor.name} (${actor.role})`,
    });

    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'CREATE_COURSE',
      targetId: courseId,
      details: { title, category },
    });

    return res.status(201).json({ success: true, courseId, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create course.' });
  }
});

router.put('/courses/:courseId', requireAuth(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const actor = req.tokenPayload!;

    const result = await SheetsClient.updateCourse(courseId, req.body);

    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'UPDATE_COURSE',
      targetId: courseId,
    });

    return res.status(200).json({ success: true, courseId, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update course.' });
  }
});

// Delete Course - ADMIN ONLY
router.delete('/courses/:courseId', requireAuth(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const actor = req.tokenPayload!;

    const result = await SheetsClient.deleteCourse(courseId);

    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'DELETE_COURSE',
      targetId: courseId,
    });

    return res.status(200).json({ success: true, courseId, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete course.' });
  }
});

// Lessons
router.post('/lessons', requireAuth(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, title, description, order, videoUrl, duration, published } = req.body;
    if (!courseId || !title) {
      return res.status(400).json({ error: 'courseId and lesson title are required.' });
    }

    const driveMeta = videoUrl ? parseGoogleDriveVideo(videoUrl) : { driveFileId: '', embedUrl: '' };
    const lessonId = `LSN-${Date.now()}`;
    const actor = req.tokenPayload!;

    const result = await SheetsClient.createLesson({
      lessonId,
      courseId,
      title,
      description: description || '',
      order: parseInt(order, 10) || 1,
      driveFileId: driveMeta.driveFileId,
      videoUrl: videoUrl || '',
      duration: duration || '15 min',
      published: published !== undefined ? !!published : true,
    });

    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'CREATE_LESSON',
      targetId: lessonId,
      details: { courseId, title },
    });

    return res.status(201).json({ success: true, lessonId, driveMeta, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create lesson.' });
  }
});

router.put('/lessons/:lessonId', requireAuth(['ADMIN', 'MODERATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const data = { ...req.body };

    if (data.videoUrl) {
      const driveMeta = parseGoogleDriveVideo(data.videoUrl);
      data.driveFileId = driveMeta.driveFileId;
    }

    const result = await SheetsClient.updateLesson(lessonId, data);
    return res.status(200).json({ success: true, lessonId, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update lesson.' });
  }
});

// Delete Lesson - ADMIN ONLY
router.delete('/lessons/:lessonId', requireAuth(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const result = await SheetsClient.deleteLesson(lessonId);
    return res.status(200).json({ success: true, lessonId, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete lesson.' });
  }
});

// Google Drive Link Parser Utility
router.post('/drive/parse', requireAuth(['ADMIN', 'MODERATOR']), (req, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required.' });
  const meta = parseGoogleDriveVideo(url);
  return res.status(200).json({ success: true, meta });
});

// ==============================================================================
// 3. USER & ROLE MANAGEMENT (Admin Only)
// ==============================================================================
router.get('/users', requireAuth(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isMongoConfigured()) {
      return res.status(503).json({ error: 'MongoDB Atlas is not configured.' });
    }

    await connectMongo();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const search = ((req.query.search as string) || '').trim();
    const roleFilter = (req.query.role as string) || '';
    const statusFilter = (req.query.status as string) || '';

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { normalizedEmail: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    if (roleFilter && ['ADMIN', 'MODERATOR', 'USER'].includes(roleFilter)) {
      filter.role = roleFilter;
    }
    if (statusFilter && ['ACTIVE', 'SUSPENDED'].includes(statusFilter)) {
      filter.accountStatus = statusFilter;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-passwordHash'),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve users.' });
  }
});

// Update User Role with Last Admin Protection
router.put('/users/:userId/role', requireAuth(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const currentAdmin = req.tokenPayload!;

    if (!role || !['ADMIN', 'MODERATOR', 'USER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    if (!isMongoConfigured()) {
      return res.status(503).json({ error: 'MongoDB Atlas is not configured.' });
    }

    await connectMongo();
    const targetUser = await User.findOne({ userId });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protection against removing the last active administrator
    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', accountStatus: 'ACTIVE' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: 'Action blocked: Cannot revoke or demote the last active Administrator.',
        });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role as UserRole;
    await targetUser.save();

    await SheetsClient.logActivity({
      actorUserId: currentAdmin.userId,
      actorRole: currentAdmin.role,
      action: 'UPDATE_USER_ROLE',
      targetId: userId,
      details: { previousRole, newRole: role, targetEmail: targetUser.normalizedEmail },
    });

    return res.status(200).json({
      success: true,
      userId,
      role: targetUser.role,
      message: `User role updated from ${previousRole} to ${role}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update user role.' });
  }
});

// Update Account Status (Suspend / Activate)
router.put('/users/:userId/status', requireAuth(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const currentAdmin = req.tokenPayload!;

    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid account status specified.' });
    }

    if (currentAdmin.userId === userId && status === 'SUSPENDED') {
      return res.status(400).json({ error: 'You cannot suspend your own administrative account.' });
    }

    await connectMongo();
    const targetUser = await User.findOne({ userId });
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });

    if (targetUser.role === 'ADMIN' && status === 'SUSPENDED') {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', accountStatus: 'ACTIVE' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: 'Cannot suspend the last active Administrator.' });
      }
    }

    targetUser.accountStatus = status;
    await targetUser.save();

    // Sync status change to Users sheet
    SheetsClient.syncUser({
      userId: targetUser.userId,
      normalizedEmail: targetUser.normalizedEmail,
      registeredAt: targetUser.createdAt.toISOString(),
      accountStatus: status,
      emailVerified: targetUser.emailVerified,
    }).catch((e) => console.warn('Sheets status update error:', e));

    return res.status(200).json({
      success: true,
      userId,
      accountStatus: targetUser.accountStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update user status.' });
  }
});

// ==============================================================================
// 4. EMAIL ANNOUNCEMENTS (Admin Only)
// ==============================================================================
router.post('/emails/preview', requireAuth(['ADMIN']), async (req, res: Response) => {
  try {
    const { recipientGroup = 'all' } = req.body;
    const preview = await SheetsClient.previewEmail(recipientGroup);
    return res.status(200).json(preview);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to preview email.' });
  }
});

router.post('/emails/send', requireAuth(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, body, recipientGroup = 'all' } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and email body are required.' });
    }

    const actor = req.tokenPayload!;
    const campaignId = `CAMP-${Date.now()}`;

    const result = await SheetsClient.sendEmailAnnouncement({
      campaignId,
      subject,
      body,
      recipientGroup,
    });

    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'SEND_EMAIL_CAMPAIGN',
      targetId: campaignId,
      details: { subject, recipientGroup, sentCount: result?.sentCount },
    });

    return res.status(200).json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to dispatch email campaign.' });
  }
});

router.get('/emails/logs', requireAuth(['ADMIN']), async (_req, res: Response) => {
  try {
    const logs = await SheetsClient.getEmailLogs();
    return res.status(200).json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve email logs.' });
  }
});

// Activity logs
router.get('/logs', requireAuth(['ADMIN']), async (_req, res: Response) => {
  try {
    const logs = await SheetsClient.getActivityLogs();
    return res.status(200).json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve activity logs.' });
  }
});

export default router;
