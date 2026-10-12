import {
  UserProfile,
  UserEnrollment,
  QuizAttempt,
  ExpenseRecord,
  BusinessPlan,
} from '../types';

const DB_KEYS = {
  EXPENSES_PREFIX: 'sakhibiz_exp_',
  QUIZ_PREFIX: 'sakhibiz_quiz_',
  PLANS_PREFIX: 'sakhibiz_plan_',
  ENROLLMENTS_PREFIX: 'sakhibiz_enr_',
};

/**
 * Client Data Service for learner toolkit and quiz records.
 * In the MongoDB + Google Sheets architecture:
 * - User authentication & identity is handled by MongoDB Atlas.
 * - Course CMS and enrollments are synced to Google Sheets.
 * - Interactive client-side business calculator and quiz records are managed here.
 */
export const DbService = {
  // Enrollments
  getEnrollments(userId: string): Record<string, UserEnrollment> {
    try {
      const raw = localStorage.getItem(`${DB_KEYS.ENROLLMENTS_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  saveEnrollment(userId: string, enrollment: UserEnrollment): void {
    try {
      const current = this.getEnrollments(userId);
      current[enrollment.courseId] = enrollment;
      localStorage.setItem(`${DB_KEYS.ENROLLMENTS_PREFIX}${userId}`, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save enrollment locally:', e);
    }
  },

  // Quiz Attempts
  getQuizAttempts(userId: string): QuizAttempt[] {
    try {
      const raw = localStorage.getItem(`${DB_KEYS.QUIZ_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveQuizAttempt(userId: string, attempt: QuizAttempt): void {
    try {
      const current = this.getQuizAttempts(userId);
      const updated = [attempt, ...current];
      localStorage.setItem(`${DB_KEYS.QUIZ_PREFIX}${userId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save quiz attempt locally:', e);
    }
  },

  // Expenses
  getExpenses(userId: string): ExpenseRecord[] {
    try {
      const raw = localStorage.getItem(`${DB_KEYS.EXPENSES_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addExpense(
    userId: string,
    expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>
  ): ExpenseRecord {
    const record: ExpenseRecord = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      ...expense,
      createdAt: new Date().toISOString(),
    };
    const current = this.getExpenses(userId);
    const updated = [record, ...current];
    try {
      localStorage.setItem(`${DB_KEYS.EXPENSES_PREFIX}${userId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save expense locally:', e);
    }
    return record;
  },

  deleteExpense(userId: string, expenseId: string): void {
    try {
      const current = this.getExpenses(userId);
      const updated = current.filter((e) => e.id !== expenseId);
      localStorage.setItem(`${DB_KEYS.EXPENSES_PREFIX}${userId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete expense locally:', e);
    }
  },

  // Business Plans
  getBusinessPlans(userId: string): BusinessPlan[] {
    try {
      const raw = localStorage.getItem(`${DB_KEYS.PLANS_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveBusinessPlan(userId: string, plan: BusinessPlan): BusinessPlan {
    const updatedPlan: BusinessPlan = {
      ...plan,
      userId,
      updatedAt: new Date().toISOString(),
    };
    const current = this.getBusinessPlans(userId);
    const updated = [updatedPlan, ...current.filter((p) => p.id !== updatedPlan.id)];
    try {
      localStorage.setItem(`${DB_KEYS.PLANS_PREFIX}${userId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save business plan locally:', e);
    }
    return updatedPlan;
  },
};
