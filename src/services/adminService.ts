import { apiRequest } from '../lib/api';

export interface AdminStatsResponse {
  success: boolean;
  userRole: 'ADMIN' | 'MODERATOR' | 'USER';
  mongoConnected: boolean;
  sheetsConnected: boolean;
  geminiConfigured: boolean;
  stats: {
    totalRegisteredUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    verifiedUsers: number;
    adminCount: number;
    moderatorCount: number;
    publishedCoursesCount: number;
    totalLessonsCount: number;
    totalEnrollments: number;
    dailyMailQuotaRemaining: number | string;
  };
}

export interface AdminUserRecord {
  _id: string;
  userId: string;
  normalizedEmail: string;
  name: string;
  role: 'ADMIN' | 'MODERATOR' | 'USER';
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  businessCategory: string;
  location: string;
  language: string;
  sheetsSynced: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export const AdminService = {
  async getStats(): Promise<AdminStatsResponse> {
    return apiRequest<AdminStatsResponse>('/api/admin/stats');
  },

  async getCourses(): Promise<any[]> {
    const data = await apiRequest<{ success: boolean; courses: any[] }>('/api/admin/courses');
    return data?.courses || [];
  },

  async createCourse(courseData: any): Promise<any> {
    return apiRequest('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  async updateCourse(courseId: string, courseData: any): Promise<any> {
    return apiRequest(`/api/admin/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  async deleteCourse(courseId: string): Promise<any> {
    return apiRequest(`/api/admin/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  async createLesson(lessonData: any): Promise<any> {
    return apiRequest('/api/admin/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  },

  async updateLesson(lessonId: string, lessonData: any): Promise<any> {
    return apiRequest(`/api/admin/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    });
  },

  async deleteLesson(lessonId: string): Promise<any> {
    return apiRequest(`/api/admin/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  },

  async parseDriveUrl(url: string): Promise<any> {
    return apiRequest('/api/admin/drive/parse', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  } = {}): Promise<{
    users: AdminUserRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);

    return apiRequest(`/api/admin/users?${query.toString()}`);
  },

  async updateUserRole(userId: string, role: 'ADMIN' | 'MODERATOR' | 'USER'): Promise<any> {
    return apiRequest(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<any> {
    return apiRequest(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async previewEmail(recipientGroup: string): Promise<any> {
    return apiRequest('/api/admin/emails/preview', {
      method: 'POST',
      body: JSON.stringify({ recipientGroup }),
    });
  },

  async sendEmailAnnouncement(campaign: {
    subject: string;
    body: string;
    recipientGroup: string;
  }): Promise<any> {
    return apiRequest('/api/admin/emails/send', {
      method: 'POST',
      body: JSON.stringify(campaign),
    });
  },

  async getEmailLogs(): Promise<any[]> {
    const data = await apiRequest<{ success: boolean; logs: any[] }>('/api/admin/emails/logs');
    return data?.logs || [];
  },

  async getActivityLogs(): Promise<any[]> {
    const data = await apiRequest<{ success: boolean; logs: any[] }>('/api/admin/logs');
    return data?.logs || [];
  },

  // ==============================================================================
  // AI PROVIDER SETTINGS & FAILOVER MANAGEMENT (Admin Only)
  // ==============================================================================
  async getAiOverview(): Promise<AdminAiOverviewResponse> {
    return apiRequest<AdminAiOverviewResponse>('/api/admin/ai/overview');
  },

  async addAiKeys(
    provider: 'groq' | 'gemini',
    rawKeys: string,
    metadata?: { projectId?: string; orgId?: string }
  ): Promise<{ success: boolean; added: number; skipped: number; keys: AdminAiKeyItem[] }> {
    return apiRequest('/api/admin/ai/keys', {
      method: 'POST',
      body: JSON.stringify({ provider, rawKeys, ...metadata }),
    });
  },

  async updateAiKey(
    keyId: string,
    updates: { enabled?: boolean; status?: string; projectId?: string; orgId?: string }
  ): Promise<{ success: boolean; key: AdminAiKeyItem }> {
    return apiRequest(`/api/admin/ai/keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteAiKey(keyId: string): Promise<{ success: boolean }> {
    return apiRequest(`/api/admin/ai/keys/${keyId}`, {
      method: 'DELETE',
    });
  },

  async testAiKey(
    keyId: string
  ): Promise<{ success: boolean; latencyMs: number; message: string; modelUsed: string }> {
    return apiRequest(`/api/admin/ai/keys/${keyId}/test`, {
      method: 'POST',
    });
  },

  async updateAiProviderConfig(
    provider: 'groq' | 'gemini',
    config: Partial<AdminAiProviderConfig>
  ): Promise<{ success: boolean; config: AdminAiProviderConfig }> {
    return apiRequest(`/api/admin/ai/config/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },
};

export interface AdminAiKeyItem {
  id: string;
  provider: 'groq' | 'gemini';
  maskedKey: string;
  keyFingerprint: string;
  status: 'ACTIVE' | 'FAILED' | 'TEMPORARILY_UNAVAILABLE' | 'DISABLED' | 'NEEDS_CONFIGURATION';
  enabled: boolean;
  projectId?: string;
  orgId?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastSuccessAt?: string;
  lastCheckedAt?: string;
  lastErrorCategory?: string;
  lastErrorMessage?: string;
  cooldownUntil?: number;
  failureCount: number;
  successCount: number;
}

export interface AdminAiProviderConfig {
  provider: 'groq' | 'gemini';
  preferredModel: string;
  supportedModels: string[];
  maxRequestsPerMinute: number;
  maxDailyRequests: number;
  retryBudget: number;
  timeoutMs: number;
}

export interface AdminAiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  providers: Record<
    'groq' | 'gemini',
    {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      retriedRequests: number;
      activeKeysCount: number;
      cooldownKeysCount: number;
      failedKeysCount: number;
      disabledKeysCount: number;
      preferredModel: string;
    }
  >;
  recentEvents: Array<{
    id: string;
    timestamp: string;
    provider: 'groq' | 'gemini';
    model: string;
    keyId: string;
    success: boolean;
    errorCategory?: string;
    retryCount: number;
    latencyMs: number;
  }>;
}

export interface AdminAiOverviewResponse {
  success: boolean;
  keys: AdminAiKeyItem[];
  configs: {
    groq: AdminAiProviderConfig;
    gemini: AdminAiProviderConfig;
  };
  metrics: AdminAiMetrics;
}
