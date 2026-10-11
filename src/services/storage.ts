import {
  UserProfile,
  UserEnrollment,
  QuizAttempt,
  ExpenseRecord,
  BusinessPlan,
  ChatMessage,
  Language,
} from '../types';

const STORAGE_KEYS = {
  GUEST_USER: 'sakhibiz_guest_user',
  GUEST_ENROLLMENTS: 'sakhibiz_guest_enrollments',
  GUEST_QUIZ_ATTEMPTS: 'sakhibiz_guest_quiz_attempts',
  GUEST_EXPENSES: 'sakhibiz_guest_expenses',
  GUEST_BUSINESS_PLANS: 'sakhibiz_guest_business_plans',
  SAVED_COURSES: 'sakhibiz_saved_courses',
  CHAT_HISTORY: 'sakhibiz_chat_history',
  LANGUAGE: 'sakhibiz_language',
};

export const StorageService = {
  // Language preference
  getLanguage(): Language {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language;
      const valid: Language[] = ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'];
      return valid.includes(stored) ? stored : 'hi';
    } catch {
      return 'hi';
    }
  },

  setLanguage(lang: Language): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (e) {
      console.warn('Failed to save language to local storage', e);
    }
  },

  // Guest Learner Profile (Local device only)
  createGuestUser(preferredLanguage: Language = 'hi'): UserProfile {
    const guest: UserProfile = {
      id: `guest-${Date.now()}`,
      name: preferredLanguage === 'hi' ? 'अतिथि शिक्षार्थी (Guest Learner)' : 'Guest Learner',
      email: 'guest@sakhibiz.local',
      role: 'USER',
      accountStatus: 'ACTIVE',
      preferredLanguage,
      businessCategory: 'textiles_tailoring',
      businessStage: 'idea',
      location: preferredLanguage === 'hi' ? 'स्थानीय मोड' : 'Local Device',
      isDemoUser: false,
      createdAt: new Date().toISOString(),
      streakDays: 1,
      completedCoursesCount: 0,
    };
    this.setGuestUser(guest);
    return guest;
  },

  getGuestUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GUEST_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse guest profile', e);
    }
    return null;
  },

  setGuestUser(user: UserProfile | null): void {
    try {
      if (!user) {
        localStorage.removeItem(STORAGE_KEYS.GUEST_USER);
      } else {
        localStorage.setItem(STORAGE_KEYS.GUEST_USER, JSON.stringify(user));
      }
    } catch (e) {
      console.warn('Failed to store guest profile', e);
    }
  },

  // Guest Enrollments
  getGuestEnrollments(): Record<string, UserEnrollment> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GUEST_ENROLLMENTS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  },

  saveGuestEnrollments(enrollments: Record<string, UserEnrollment>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GUEST_ENROLLMENTS, JSON.stringify(enrollments));
    } catch (e) {
      console.warn('Failed to save guest enrollments', e);
    }
  },

  // Guest Quiz Attempts
  getGuestQuizAttempts(): QuizAttempt[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GUEST_QUIZ_ATTEMPTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveGuestQuizAttempts(attempts: QuizAttempt[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GUEST_QUIZ_ATTEMPTS, JSON.stringify(attempts));
    } catch (e) {
      console.warn('Failed to save guest quiz attempts', e);
    }
  },

  // Guest Expenses
  getGuestExpenses(): ExpenseRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GUEST_EXPENSES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveGuestExpenses(expenses: ExpenseRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GUEST_EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.warn('Failed to save guest expenses', e);
    }
  },

  // Guest Business Plans
  getGuestBusinessPlans(): BusinessPlan[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GUEST_BUSINESS_PLANS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveGuestBusinessPlans(plans: BusinessPlan[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GUEST_BUSINESS_PLANS, JSON.stringify(plans));
    } catch (e) {
      console.warn('Failed to save guest business plans', e);
    }
  },

  // Saved / Bookmarked Courses
  getSavedCourses(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAVED_COURSES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  toggleSaveCourse(courseId: string): string[] {
    try {
      const current = this.getSavedCourses();
      const updated = current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId];
      localStorage.setItem(STORAGE_KEYS.SAVED_COURSES, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  // Chat History
  getChatHistory(): ChatMessage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // return default
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'sakhi',
        text: 'नमस्ते दीदी! मैं "सखी" हूँ—आपकी अपनी व्यावसायिक मित्र और मार्गदर्शक। अपने छोटे व्यवसाय, लागत, मुनाफे, व्हाट्सएप मार्केटिंग या डिजिटल सुरक्षा से जुड़ा कोई भी सवाल बेझिझक पूछें!',
        timestamp: new Date().toISOString(),
        source: 'regional-knowledge-engine',
      },
    ];
  },

  saveChatHistory(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages.slice(-30)));
    } catch (e) {
      console.warn('Failed to save chat history', e);
    }
  },
};
