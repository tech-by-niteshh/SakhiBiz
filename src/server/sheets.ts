import { COURSES_DATA } from '../data/courses';

export interface DriveVideoMeta {
  driveFileId: string;
  embedUrl: string;
  viewUrl: string;
  rawUrl: string;
  isValid: boolean;
}

export function parseGoogleDriveVideo(url: string): DriveVideoMeta {
  if (!url || typeof url !== 'string') {
    return { driveFileId: '', embedUrl: '', viewUrl: '', rawUrl: '', isValid: false };
  }

  const trimmed = url.trim();

  // Pattern 1: https://drive.google.com/file/d/{id}/view
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    const id = fileDMatch[1];
    return {
      driveFileId: id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      viewUrl: `https://drive.google.com/file/d/${id}/view`,
      rawUrl: trimmed,
      isValid: true,
    };
  }

  // Pattern 2: id parameter (open?id= or uc?id=)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    const id = idParamMatch[1];
    return {
      driveFileId: id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      viewUrl: `https://drive.google.com/file/d/${id}/view`,
      rawUrl: trimmed,
      isValid: true,
    };
  }

  // Pattern 3: Standalone file ID (letters, numbers, hyphens, underscores, length >= 20)
  if (/^[a-zA-Z0-9_-]{20,50}$/.test(trimmed)) {
    return {
      driveFileId: trimmed,
      embedUrl: `https://drive.google.com/file/d/${trimmed}/preview`,
      viewUrl: `https://drive.google.com/file/d/${trimmed}/view`,
      rawUrl: `https://drive.google.com/file/d/${trimmed}/view`,
      isValid: true,
    };
  }

  return {
    driveFileId: '',
    embedUrl: trimmed,
    viewUrl: trimmed,
    rawUrl: trimmed,
    isValid: false,
  };
}

export function isSheetsConfigured(): boolean {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SHARED_SECRET;
  return (
    typeof url === 'string' &&
    url.startsWith('https://script.google.com/macros/s/') &&
    typeof secret === 'string' &&
    secret.trim().length >= 8 &&
    !secret.includes('placeholder')
  );
}

export const SheetsClient = {
  isConfigured(): boolean {
    return isSheetsConfigured();
  },

  async callAppsScript(action: string, payload: Record<string, any> = {}): Promise<any> {
    if (!isSheetsConfigured()) {
      return { success: false, fallback: true, error: 'Google Apps Script URL is not configured' };
    }

    const scriptUrl = process.env.APPS_SCRIPT_URL!.trim();
    const sharedSecret = process.env.APPS_SCRIPT_SHARED_SECRET!.trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: sharedSecret,
          action,
          payload,
          timestamp: new Date().toISOString(),
        }),
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Apps Script responded with HTTP status ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      console.warn(`Apps Script invocation [${action}] failed:`, err?.message || err);
      return {
        success: false,
        error: err?.message || 'Apps Script request failed',
        fallback: true,
      };
    }
  },

  // 1. Synchronize registered user to the Users sheet
  async syncUser(userData: {
    userId: string;
    normalizedEmail: string;
    registeredAt: string;
    accountStatus: string;
    emailVerified: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isSheetsConfigured()) {
      return { success: false, error: 'Apps Script not configured' };
    }

    const res = await this.callAppsScript('syncUser', userData);
    return { success: !!res?.success, error: res?.error };
  },

  // 2. List published courses
  async listCourses(includeUnpublished = false): Promise<any[]> {
    if (isSheetsConfigured()) {
      const res = await this.callAppsScript('listCourses', { includeUnpublished });
      if (res && res.success && Array.isArray(res.courses) && res.courses.length > 0) {
        return res.courses;
      }
    }

    // Curated local curriculum fallback
    return COURSES_DATA.map((c) => ({
      courseId: c.id,
      title: c.title.hi,
      titleEn: c.title.en,
      description: c.shortDescription.hi,
      descriptionEn: c.shortDescription.en,
      category: c.category,
      language: 'hi,en',
      thumbnailUrl: c.thumbnail,
      published: true,
      lessonsCount: c.lessons.length,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'System Seed',
    }));
  },

  // 3. Get course detail with lessons
  async getCourse(courseId: string): Promise<any | null> {
    if (isSheetsConfigured()) {
      const res = await this.callAppsScript('getCourse', { courseId });
      if (res && res.success && res.course) {
        return res;
      }
    }

    // Local fallback
    const local = COURSES_DATA.find((c) => c.id === courseId);
    if (!local) return null;

    return {
      success: true,
      course: {
        courseId: local.id,
        title: local.title.hi,
        titleEn: local.title.en,
        description: local.fullDescription.hi,
        descriptionEn: local.fullDescription.en,
        category: local.category,
        language: 'hi,en',
        thumbnailUrl: local.thumbnail,
        published: true,
        createdBy: 'System Seed',
      },
      lessons: local.lessons.map((l) => ({
        lessonId: l.id,
        courseId: local.id,
        title: l.title.hi,
        titleEn: l.title.en,
        description: l.summary.hi,
        order: l.order,
        driveFileId: '',
        videoUrl: '',
        duration: `${l.durationMinutes} min`,
        published: true,
        content: l.content,
      })),
      quiz: local.quiz,
    };
  },

  // 4. Admin CRUD Operations for Courses
  async createCourse(data: any): Promise<any> {
    return this.callAppsScript('createCourse', data);
  },

  async updateCourse(courseId: string, data: any): Promise<any> {
    return this.callAppsScript('updateCourse', { courseId, ...data });
  },

  async deleteCourse(courseId: string): Promise<any> {
    return this.callAppsScript('deleteCourse', { courseId });
  },

  // 5. Admin CRUD Operations for Lessons
  async createLesson(data: any): Promise<any> {
    return this.callAppsScript('createLesson', data);
  },

  async updateLesson(lessonId: string, data: any): Promise<any> {
    return this.callAppsScript('updateLesson', { lessonId, ...data });
  },

  async deleteLesson(lessonId: string): Promise<any> {
    return this.callAppsScript('deleteLesson', { lessonId });
  },

  // 6. Enrollments in Sheets
  async recordEnrollment(data: {
    userId: string;
    normalizedEmail: string;
    courseId: string;
    status: string;
  }): Promise<any> {
    return this.callAppsScript('recordEnrollment', data);
  },

  // 7. Email Announcements via MailApp / GmailApp
  async previewEmail(recipientGroup: string): Promise<any> {
    return this.callAppsScript('previewEmail', { recipientGroup });
  },

  async sendEmailAnnouncement(campaign: {
    subject: string;
    body: string;
    recipientGroup: string;
    campaignId?: string;
  }): Promise<any> {
    return this.callAppsScript('sendEmailAnnouncement', campaign);
  },

  async getEmailLogs(): Promise<any[]> {
    const res = await this.callAppsScript('getEmailLogs');
    return res?.success && Array.isArray(res.logs) ? res.logs : [];
  },

  // 8. Activity Logs in Sheets
  async logActivity(data: {
    actorUserId: string;
    actorRole: string;
    action: string;
    targetId?: string;
    details?: any;
  }): Promise<void> {
    await this.callAppsScript('logActivity', {
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  async getActivityLogs(): Promise<any[]> {
    const res = await this.callAppsScript('getActivityLogs');
    return res?.success && Array.isArray(res.logs) ? res.logs : [];
  },

  // 9. Stats Aggregate
  async getStats(): Promise<any> {
    return this.callAppsScript('getStats');
  },
};
