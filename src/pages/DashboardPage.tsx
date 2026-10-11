import React from 'react';
import { 
  Award, 
  BookOpen, 
  Clock, 
  Flame, 
  ArrowRight, 
  Calculator, 
  TrendingUp, 
  Bookmark, 
  CheckCircle, 
  User, 
  ShieldCheck,
  Play,
  RotateCcw
} from 'lucide-react';
import { UserProfile, Course, Language, UserEnrollment, QuizAttempt, ExpenseRecord } from '../types';
import { getText, getContentText } from '../utils/translations';
import { COURSES_DATA } from '../data/courses';

interface DashboardPageProps {
  user: UserProfile;
  currentLang: Language;
  enrollments: Record<string, UserEnrollment>;
  quizAttempts: QuizAttempt[];
  expenses: ExpenseRecord[];
  savedCourseIds: string[];
  onNavigate: (tab: string, courseId?: string) => void;
  onOpenProfile: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  currentLang,
  enrollments,
  quizAttempts,
  expenses,
  savedCourseIds,
  onNavigate,
  onOpenProfile,
}) => {
  const enrolledCourseList = COURSES_DATA.filter((c) => !!enrollments[c.id]);
  const savedCourses = COURSES_DATA.filter((c) => savedCourseIds.includes(c.id));

  // Calculate total completed lessons
  const totalCompletedLessons = Object.values(enrollments).reduce(
    (sum, enr) => sum + enr.completedLessonIds.length,
    0
  );

  // Total recorded expenses
  const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-[#18392B] to-[#244f3d] rounded-3xl p-6 sm:p-10 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#E07A5F]/20 text-[#FFD5C8] border border-[#E07A5F]/40 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#E07A5F]"></span>
              <span>{user.isDemoUser ? (currentLang === 'hi' ? 'डेमो मोड सक्रिय' : 'Demo Mode Active') : 'Authenticated'}</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-extrabold tracking-tight">
              {currentLang === 'hi' ? `नमस्ते, ${user.name.split(' ')[0]}!` : `Welcome back, ${user.name.split(' ')[0]}!`}
            </h1>

            <p className="text-xs sm:text-sm text-[#C9D6CE] max-w-xl">
              {currentLang === 'hi'
                ? 'आपकी व्यावसायिक प्रगति जारी है। आज एक नया पाठ पूरा करें और अपने व्यापार को आगे बढ़ाएं।'
                : 'Continue your learning journey. Complete a micro-lesson today to boost your business skills.'}
            </p>
          </div>

          <button
            onClick={onOpenProfile}
            className="self-start md:self-auto px-4 py-2.5 bg-[#122A20] hover:bg-[#1c3f30] text-[#FFD5C8] border border-[#2d5c47] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <User className="w-4 h-4 text-[#E07A5F]" />
            <span>{currentLang === 'hi' ? 'प्रोफ़ाइल एवं प्राथमिकताएं' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* 4 Top KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{getText('streakLabel', currentLang)}</p>
              <p className="font-serif text-xl sm:text-2xl font-extrabold text-[#18392B]">
                {user.streakDays} {getText('daysLabel', currentLang)}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {currentLang === 'hi' ? 'पूरे किए पाठ' : 'Lessons Completed'}
              </p>
              <p className="font-serif text-xl sm:text-2xl font-extrabold text-[#18392B]">
                {totalCompletedLessons}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {currentLang === 'hi' ? 'क्विज़ बैज' : 'Quiz Badges'}
              </p>
              <p className="font-serif text-xl sm:text-2xl font-extrabold text-[#18392B]">
                {quizAttempts.filter((a) => a.passed).length}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {currentLang === 'hi' ? 'दर्ज खर्च' : 'Logged Expenses'}
              </p>
              <p className="font-serif text-xl sm:text-2xl font-extrabold text-[#18392B]">
                ₹{totalExpensesAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* CONTINUE LEARNING SECTION */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#18392B]">
                {currentLang === 'hi' ? 'पढ़ाई जारी रखें (Continue Learning)' : 'Enrolled Courses & Progress'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentLang === 'hi' ? 'आपके नामांकित कोर्स और प्रगति की स्थिति' : 'Active courses you are studying'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('courses')}
              className="text-xs font-bold text-[#E07A5F] hover:underline flex items-center gap-1"
            >
              <span>{getText('heroCtaCourses', currentLang)}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {enrolledCourseList.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">
                {currentLang === 'hi' ? 'अभी आपने किसी कोर्स में दाखिला नहीं लिया है।' : 'You have not enrolled in any course yet.'}
              </p>
              <button
                onClick={() => onNavigate('courses')}
                className="mt-3 px-4 py-2 bg-[#18392B] text-white text-xs font-bold rounded-xl"
              >
                {getText('heroCtaCourses', currentLang)}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrolledCourseList.map((course) => {
                const enr = enrollments[course.id];
                const pct = enr ? enr.progressPercent : 0;
                const isComplete = pct >= 100;

                return (
                  <div
                    key={course.id}
                    className="p-5 rounded-2xl border border-gray-200/90 bg-[#FBF9F5] flex flex-col justify-between hover:border-[#18392B] transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#E07A5F] bg-[#E07A5F]/10 px-2 py-0.5 rounded">
                          {course.level}
                        </span>
                        <span className="text-xs font-bold text-[#18392B]">{pct}% {getText('lessonCompleted', currentLang)}</span>
                      </div>

                      <h3 className="font-bold text-base text-[#18392B] mb-2 leading-snug">
                        {getContentText(course.title, currentLang)}
                      </h3>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className="bg-[#18392B] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span>
                          {enr?.completedLessonIds.length || 0} / {course.lessons.length} {getText('lessonsCount', currentLang)}
                        </span>
                        <span>•</span>
                        <span>{getContentText(course.badgeTitle, currentLang)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('learn', course.id)}
                      className="w-full py-2.5 bg-[#18392B] hover:bg-[#244f3d] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isComplete ? getText('courseCompleted', currentLang) : getText('continueLearning', currentLang)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* QUICK BUSINESS TOOLKIT SHORTCUTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => onNavigate('tools')}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#18392B] text-white flex items-center justify-center mb-3">
              <Calculator className="w-5 h-5 text-[#FFD5C8]" />
            </div>
            <h3 className="font-bold text-base text-[#18392B] mb-1">
              {getText('tabProfitCalc', currentLang)}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              {currentLang === 'hi' ? 'सामान की लागत और बिक्री मूल्य डालकर शुद्ध मुनाफा जानें।' : 'Calculate exact profit margins and markups.'}
            </p>
            <span className="text-xs font-bold text-[#E07A5F] flex items-center gap-1 group-hover:underline">
              {currentLang === 'hi' ? 'कैलकुलेटर चलाएं' : 'Open Tool'} <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div 
            onClick={() => onNavigate('tools')}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#18392B] text-white flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-[#FFD5C8]" />
            </div>
            <h3 className="font-bold text-base text-[#18392B] mb-1">
              {getText('tabExpenseTracker', currentLang)}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              {currentLang === 'hi' ? 'दैनिक खर्चे दर्ज करें और कुल व्यय का हिसाब रखें।' : 'Log daily raw material purchases and overheads.'}
            </p>
            <span className="text-xs font-bold text-[#E07A5F] flex items-center gap-1 group-hover:underline">
              {currentLang === 'hi' ? 'खर्च डायरी खोलें' : 'Open Tracker'} <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div 
            onClick={() => onNavigate('assistant')}
            className="bg-[#18392B] text-white p-6 rounded-2xl border border-[#244f3d] shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/20 text-[#FFD5C8] flex items-center justify-center mb-3">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-1">
              {getText('navAssistant', currentLang)}
            </h3>
            <p className="text-xs text-[#C9D6CE] leading-relaxed mb-3">
              {currentLang === 'hi' ? 'दुकान या व्यापार से जुड़ा कोई भी सवाल अपनी भाषा में पूछें।' : 'Ask micro-business and pricing questions in Hindi.'}
            </p>
            <span className="text-xs font-bold text-[#FFD5C8] flex items-center gap-1 group-hover:underline">
              {currentLang === 'hi' ? 'सखी से पूछें' : 'Chat with Sakhi'} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* SAVED COURSES */}
        {savedCourses.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-[#18392B] mb-4 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#E07A5F]" />
              <span>{currentLang === 'hi' ? 'सहेजे गए कोर्स (Saved Bookmarks)' : 'Saved Courses'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCourses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate('learn', c.id)}
                  className="p-4 rounded-xl border border-gray-200 hover:border-[#18392B] cursor-pointer transition-all bg-[#FBF9F5]"
                >
                  <h4 className="font-bold text-sm text-[#18392B] mb-1">{getContentText(c.title, currentLang)}</h4>
                  <p className="text-xs text-gray-500 line-clamp-1">{getContentText(c.shortDescription, currentLang)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
