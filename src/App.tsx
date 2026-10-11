import React, { useState, useEffect, useCallback } from 'react';
import i18n from './i18n';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseLearningPage } from './pages/CourseLearningPage';
import { QuizPage } from './pages/QuizPage';
import { ToolkitPage } from './pages/ToolkitPage';
import { AssistantPage } from './pages/AssistantPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { COURSES_DATA } from './data/courses';
import { StorageService } from './services/storage';
import { AuthService } from './services/auth';
import { DbService } from './services/db';
import {
  Language,
  UserProfile,
  UserEnrollment,
  QuizAttempt,
  ExpenseRecord,
  BusinessPlan,
} from './types';
import { CloudOff, UserPlus } from 'lucide-react';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>(() => StorageService.getLanguage());
  const [user, setUser] = useState<UserProfile>(() => {
    return StorageService.getGuestUser() || StorageService.createGuestUser('hi');
  });
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('course-cost-pricing-profit');

  // Application data states
  const [enrollments, setEnrollments] = useState<Record<string, UserEnrollment>>({});
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [businessPlans, setBusinessPlans] = useState<BusinessPlan[]>([]);
  const [savedCourseIds, setSavedCourseIds] = useState<string[]>(() =>
    StorageService.getSavedCourses()
  );

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const isGuest = user.id.startsWith('guest-');

  // Load user data based on authentication status
  const loadUserData = useCallback(async (userId: string, guestMode: boolean) => {
    setIsLoadingData(true);
    try {
      if (guestMode) {
        setEnrollments(StorageService.getGuestEnrollments());
        setQuizAttempts(StorageService.getGuestQuizAttempts());
        setExpenses(StorageService.getGuestExpenses());
        setBusinessPlans(StorageService.getGuestBusinessPlans());
      } else {
        const [userEnrollments, userQuizzes, userExpenses, userPlans] = await Promise.all([
          DbService.getEnrollments(userId),
          DbService.getQuizAttempts(userId),
          DbService.getExpenses(userId),
          DbService.getBusinessPlans(userId),
        ]);
        setEnrollments(userEnrollments);
        setQuizAttempts(userQuizzes);
        setExpenses(userExpenses);
        setBusinessPlans(userPlans);
      }
    } catch (err) {
      console.warn('Error loading user records:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Restore authenticated session on startup
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const sessionProfile = await AuthService.restoreSession();
        if (sessionProfile && mounted) {
          setUser(sessionProfile);
          await loadUserData(sessionProfile.id, false);
          return;
        }
      } catch (err) {
        console.warn('Session verification fallback to guest mode:', err);
      }

      if (mounted) {
        const guest = StorageService.getGuestUser() || StorageService.createGuestUser(currentLang);
        setUser(guest);
        await loadUserData(guest.id, true);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [loadUserData, currentLang]);

  // Language management
  const handleLanguageChange = async (lang: Language) => {
    setCurrentLang(lang);
    StorageService.setLanguage(lang);
    i18n.changeLanguage(lang);
    const updatedUser = { ...user, preferredLanguage: lang };
    setUser(updatedUser);

    if (isGuest) {
      StorageService.setGuestUser(updatedUser);
    } else {
      try {
        await AuthService.updateProfile({ preferredLanguage: lang });
      } catch (e) {
        console.warn('Failed to persist language in profile:', e);
      }
    }
  };

  // Profile update
  const handleUpdateUser = async (updated: UserProfile) => {
    setUser(updated);
    if (isGuest) {
      StorageService.setGuestUser(updated);
    } else {
      try {
        await AuthService.updateProfile(updated);
      } catch (e) {
        console.warn('Failed to persist profile updates:', e);
      }
    }

    if (updated.preferredLanguage !== currentLang) {
      setCurrentLang(updated.preferredLanguage);
      StorageService.setLanguage(updated.preferredLanguage);
    }
  };

  // Course enrollment
  const handleEnrollCourse = async (courseId: string) => {
    if (enrollments[courseId]) return;

    const newEnrollment: UserEnrollment = {
      courseId,
      enrolledAt: new Date().toISOString(),
      completedLessonIds: [],
      progressPercent: 0,
    };

    const updated = { ...enrollments, [courseId]: newEnrollment };
    setEnrollments(updated);

    if (isGuest) {
      StorageService.saveGuestEnrollments(updated);
    } else {
      try {
        await DbService.saveEnrollment(user.id, newEnrollment);
      } catch (e) {
        console.error('Failed to sync enrollment:', e);
      }
    }
  };

  // Lesson completion
  const handleMarkLessonComplete = async (lessonId: string) => {
    const course = COURSES_DATA.find((c) => c.id === selectedCourseId);
    if (!course) return;

    const currentEnrollment = enrollments[selectedCourseId] || {
      courseId: selectedCourseId,
      enrolledAt: new Date().toISOString(),
      completedLessonIds: [],
      progressPercent: 0,
    };

    const alreadyCompleted = currentEnrollment.completedLessonIds.includes(lessonId);
    const completedLessonIds = alreadyCompleted
      ? currentEnrollment.completedLessonIds
      : [...currentEnrollment.completedLessonIds, lessonId];

    const totalLessons = course.lessons.length;
    const progressPercent = Math.min(
      100,
      Math.round((completedLessonIds.length / totalLessons) * 100)
    );

    const updatedEnrollment: UserEnrollment = {
      ...currentEnrollment,
      completedLessonIds,
      progressPercent,
      lastAccessedLessonId: lessonId,
      completedAt: progressPercent >= 100 ? new Date().toISOString() : undefined,
    };

    const updatedMap = { ...enrollments, [selectedCourseId]: updatedEnrollment };
    setEnrollments(updatedMap);

    if (isGuest) {
      StorageService.saveGuestEnrollments(updatedMap);
    } else {
      try {
        await DbService.saveEnrollment(user.id, updatedEnrollment);
      } catch (e) {
        console.error('Failed to persist lesson progress:', e);
      }
    }
  };

  // Quiz completion
  const handleQuizComplete = async (attempt: QuizAttempt) => {
    const updatedAttempts = [attempt, ...quizAttempts];
    setQuizAttempts(updatedAttempts);

    if (isGuest) {
      StorageService.saveGuestQuizAttempts(updatedAttempts);
    } else {
      try {
        await DbService.saveQuizAttempt(user.id, attempt);
      } catch (e) {
        console.error('Failed to persist quiz attempt:', e);
      }
    }

    // If quiz passed, grant 100% completion to this course
    if (attempt.passed) {
      const course = COURSES_DATA.find((c) => c.id === attempt.courseId);
      if (course) {
        const fullLessonIds = course.lessons.map((l) => l.id);
        const fullEnrollment: UserEnrollment = {
          courseId: course.id,
          enrolledAt: enrollments[course.id]?.enrolledAt || new Date().toISOString(),
          completedLessonIds: fullLessonIds,
          progressPercent: 100,
          completedAt: new Date().toISOString(),
        };

        const updatedEnrollments = { ...enrollments, [course.id]: fullEnrollment };
        setEnrollments(updatedEnrollments);

        if (isGuest) {
          StorageService.saveGuestEnrollments(updatedEnrollments);
        } else {
          try {
            await DbService.saveEnrollment(user.id, fullEnrollment);
          } catch (e) {
            console.error('Failed to mark course complete on quiz pass:', e);
          }
        }
      }
    }
  };

  // Expense management
  const handleAddExpense = async (
    expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>
  ) => {
    if (isGuest) {
      const newRec: ExpenseRecord = {
        id: `exp-${Date.now()}`,
        userId: user.id,
        ...expense,
        createdAt: new Date().toISOString(),
      };
      const updated = [newRec, ...expenses];
      setExpenses(updated);
      StorageService.saveGuestExpenses(updated);
    } else {
      const added = await DbService.addExpense(user.id, expense);
      setExpenses([added, ...expenses]);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);

    if (isGuest) {
      StorageService.saveGuestExpenses(updated);
    } else {
      await DbService.deleteExpense(user.id, id);
    }
  };

  // Business plan management
  const handleSaveBusinessPlan = async (plan: BusinessPlan) => {
    if (isGuest) {
      const updatedList = [plan, ...businessPlans.filter((p) => p.id !== plan.id)];
      setBusinessPlans(updatedList);
      StorageService.saveGuestBusinessPlans(updatedList);
    } else {
      const saved = await DbService.saveBusinessPlan(user.id, plan);
      setBusinessPlans([saved, ...businessPlans.filter((p) => p.id !== saved.id)]);
    }
  };

  // Bookmarking
  const handleToggleSaveCourse = (courseId: string) => {
    const updated = StorageService.toggleSaveCourse(courseId);
    setSavedCourseIds(updated);
  };

  // Sign out
  const handleSignOut = async () => {
    await AuthService.signOut();
    const guest = StorageService.createGuestUser(currentLang);
    setUser(guest);
    await loadUserData(guest.id, true);
  };

  // Auth success
  const handleAuthSuccess = async (loggedUser: UserProfile) => {
    setUser(loggedUser);
    await loadUserData(loggedUser.id, false);
  };

  const handleNavigate = (tab: string, courseId?: string) => {
    if (courseId) {
      setSelectedCourseId(courseId);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentCourse =
    COURSES_DATA.find((c) => c.id === selectedCourseId) || COURSES_DATA[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] font-sans antialiased text-[#242A27]">
      {/* Guest Mode Advisory Banner */}
      {isGuest && (
        <aside aria-label="Guest session status" className="bg-[#122A20] text-[#FFD5C8] border-b border-[#2d5c47] px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <CloudOff className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
              <span>
                {currentLang === 'hi'
                  ? 'अतिथि मोड: व्यक्तिगत खाता रहित सत्र। व्यावसायिक गणनाएं एवं क्विज़ प्रगति इस डिवाइस पर सुरक्षित हैं।'
                  : 'Guest Mode: Toolkit expenses & quizzes are saved locally on this browser. Create an account to access certified enrollments.'}
              </span>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center gap-1 font-bold text-white hover:text-[#FFC4B3] underline text-xs self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />
              <span>
                {currentLang === 'hi' ? 'खाता बनाएं / लॉग इन करें' : 'Sign In / Register'}
              </span>
            </button>
          </div>
        </aside>
      )}

      {/* Top Navigation */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <LandingPage
            currentLang={currentLang}
            onNavigate={handleNavigate}
            onOpenAuth={() => setIsAuthOpen(true)}
            onEnroll={handleEnrollCourse}
            enrolledCourseIds={Object.keys(enrollments)}
            onLanguageChange={handleLanguageChange}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesPage
            currentLang={currentLang}
            onNavigate={handleNavigate}
            onEnroll={handleEnrollCourse}
            enrolledCourseIds={Object.keys(enrollments)}
            savedCourseIds={savedCourseIds}
            onToggleSave={handleToggleSaveCourse}
          />
        )}

        {activeTab === 'learn' && (
          <CourseLearningPage
            course={currentCourse}
            currentLang={currentLang}
            enrollment={enrollments[currentCourse.id]}
            onMarkLessonComplete={handleMarkLessonComplete}
            onNavigate={handleNavigate}
            onStartQuiz={(courseId) => handleNavigate('quiz', courseId)}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizPage
            course={currentCourse}
            currentLang={currentLang}
            onQuizComplete={handleQuizComplete}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'tools' && (
          <ToolkitPage
            currentLang={currentLang}
            user={user}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            businessPlans={businessPlans}
            onSaveBusinessPlan={handleSaveBusinessPlan}
          />
        )}

        {activeTab === 'resources' && (
          <div className="py-6">
            <ToolkitPage
              currentLang={currentLang}
              user={user}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              businessPlans={businessPlans}
              onSaveBusinessPlan={handleSaveBusinessPlan}
            />
          </div>
        )}

        {activeTab === 'assistant' && (
          <AssistantPage
            currentLang={currentLang}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage
            user={user}
            currentLang={currentLang}
            enrollments={enrollments}
            quizAttempts={quizAttempts}
            expenses={expenses}
            savedCourseIds={savedCourseIds}
            onNavigate={handleNavigate}
            onOpenProfile={() => setIsProfileOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPage
            user={user}
            currentLang={currentLang}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        currentLang={currentLang}
        onNavigate={handleNavigate}
        onOpenFeedback={() => handleNavigate('home')}
        onLanguageChange={handleLanguageChange}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentLang={currentLang}
        onAuthSuccess={handleAuthSuccess}
        onStartGuestMode={() => {
          const guest = StorageService.getGuestUser() || StorageService.createGuestUser(currentLang);
          setUser(guest);
          loadUserData(guest.id, true);
        }}
      />

      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        currentLang={currentLang}
        onUpdateUser={handleUpdateUser}
      />
    </div>
  );
}
