import { Router, Request, Response } from 'express';
import { SheetsClient } from '../sheets';
import { requireAuth, AuthenticatedRequest } from '../auth';

const router = Router();

// Get list of published courses
router.get('/', async (req: Request, res: Response) => {
  try {
    const courses = await SheetsClient.listCourses(false);
    return res.status(200).json({ success: true, courses });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve courses.' });
  }
});

// Get course detail with lessons
router.get('/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const courseData = await SheetsClient.getCourse(courseId);

    if (!courseData || !courseData.course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    return res.status(200).json({ success: true, ...courseData });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve course detail.' });
  }
});

// Enroll in a course (Authenticated users)
router.post('/:courseId/enroll', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const user = req.tokenPayload!;

    const result = await SheetsClient.recordEnrollment({
      userId: user.userId,
      normalizedEmail: user.email,
      courseId,
      status: 'ENROLLED',
    });

    return res.status(200).json({
      success: true,
      enrollment: {
        courseId,
        userId: user.userId,
        enrolledAt: new Date().toISOString(),
        status: 'ENROLLED',
      },
      sheetsResult: result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to record enrollment.' });
  }
});

export default router;
