import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Circle, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  Award, 
  Bookmark, 
  Clock, 
  X,
  Lightbulb,
  FileCheck,
  Video,
  ExternalLink,
  Info,
  Globe
} from 'lucide-react';
import { Course, Lesson, Language, UserEnrollment } from '../types';
import { getText, getContentText } from '../utils/translations';

interface CourseLearningPageProps {
  course: Course;
  currentLang: Language;
  enrollment?: UserEnrollment;
  onMarkLessonComplete: (lessonId: string) => void;
  onNavigate: (tab: string, courseId?: string) => void;
  onStartQuiz: (courseId: string) => void;
}

export const CourseLearningPage: React.FC<CourseLearningPageProps> = ({
  course,
  currentLang,
  enrollment,
  onMarkLessonComplete,
  onNavigate,
  onStartQuiz,
}) => {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [simplifying, setSimplifying] = useState(false);
  const [simplifiedContent, setSimplifiedContent] = useState<string | null>(null);
  const [showSimplifyModal, setShowSimplifyModal] = useState(false);

  const lessons = course.lessons;
  const currentLesson: Lesson = lessons[currentLessonIndex] || lessons[0];
  const completedIds = enrollment?.completedLessonIds || [];
  const isCurrentLessonCompleted = completedIds.includes(currentLesson.id);

  const progressPercent = Math.min(
    100,
    Math.round((completedIds.length / Math.max(1, lessons.length)) * 100)
  );

  const handleNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSimplifyWithAI = async () => {
    setSimplifying(true);
    setShowSimplifyModal(true);
    try {
      const res = await fetch('/api/ai/simplify-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: getContentText(currentLesson.title, currentLang),
          context: getContentText(currentLesson.summary, currentLang),
          language: currentLang,
        }),
      });
      const data = await res.json();
      setSimplifiedContent(data.simplifiedContent || 'सरल व्याख्या उपलब्ध है।');
    } catch {
      setSimplifiedContent(
        currentLang === 'hi'
          ? 'सुनीता दीदी का नियम: जब भी आप कोई सामान बनाएं, तो उसमें कच्चे माल के साथ-साथ अपनी 1 घंटे की मेहनत के ₹40 और बिजली-पैकिंग के ₹15 ज़रूर जोड़ें। तभी आपका व्यापार सुरक्षित रहेगा।'
          : 'Golden Rule: When selling any product, always add your labor wage (₹40/hr) and indirect overheads (packing, power) to raw materials.'
      );
    } finally {
      setSimplifying(false);
    }
  };

  const hasNativeContent = Boolean((currentLesson.content as any)[currentLang]);
  const lessonContent = (currentLesson.content as any)[currentLang] || currentLesson.content.hi || currentLesson.content.en;

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Back & Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => onNavigate('courses')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#18392B] hover:text-[#E07A5F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentLang === 'hi' ? 'सभी कोर्स पर वापस जाएं' : 'Back to All Courses'}</span>
          </button>

          {/* Course Progress indicator */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm self-start sm:self-auto">
            <div className="text-right">
              <span className="text-[11px] text-gray-500 font-medium block">
                {currentLang === 'hi' ? 'कोर्स प्रगति' : 'Course Progress'}
              </span>
              <span className="text-xs font-bold text-[#18392B]">
                {completedIds.length} / {lessons.length} {getText('lessonsCount', currentLang)} ({progressPercent}%)
              </span>
            </div>
            <div className="w-20 bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#E07A5F] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Learning Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: LESSON NAVIGATION SIDEBAR (4 cols on lg) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E07A5F]">
                {course.level}
              </span>
              <h2 className="font-serif text-lg font-bold text-[#18392B] mt-0.5">
                {getContentText(course.title, currentLang)}
              </h2>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {currentLang === 'hi' ? 'पाठ सूची (Syllabus)' : 'Lessons Syllabus'}
              </h3>

              <div className="space-y-1.5">
                {lessons.map((lesson, idx) => {
                  const isCurrent = idx === currentLessonIndex;
                  const isDone = completedIds.includes(lesson.id);

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setCurrentLessonIndex(idx);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all flex items-start gap-2.5 ${
                        isCurrent
                          ? 'bg-[#18392B] text-white shadow-sm'
                          : 'hover:bg-[#FBF9F5] text-gray-800'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle className={`w-4 h-4 ${isCurrent ? 'text-[#FFD5C8]' : 'text-emerald-600'}`} />
                        ) : (
                          <Circle className={`w-4 h-4 ${isCurrent ? 'text-gray-400' : 'text-gray-300'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold line-clamp-1 ${isCurrent ? 'text-white' : 'text-[#18392B]'}`}>
                          {getContentText(lesson.title, currentLang)}
                        </p>
                        <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isCurrent ? 'text-[#C9D6CE]' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" />
                          <span>{lesson.durationMinutes} मिनट</span>
                          {isDone && <span className="text-emerald-500 font-bold">• पूरा हुआ</span>}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quiz Entry Point in Sidebar */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => onStartQuiz(course.id)}
                className="w-full py-3 bg-[#E8ECE9] hover:bg-[#dbe2dc] text-[#18392B] border border-[#8DA399]/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4 text-[#E07A5F]" />
                <span>{getText('takeQuiz', currentLang)}</span>
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-1.5">
                {currentLang === 'hi'
                  ? '75% स्कोर करने पर प्रमाणपत्र बैज प्राप्त करें'
                  : 'Score 75% or higher to earn the completion badge'}
              </p>
            </div>
          </div>

          {/* RIGHT: CURRENT LESSON READING PANE (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Lesson Container Card */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
              {/* Lesson Header */}
              <div className="border-b border-gray-100 pb-5 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#E07A5F] bg-[#E07A5F]/10 px-2.5 py-0.5 rounded-full">
                    {currentLang === 'hi' ? `पाठ ${currentLessonIndex + 1} / ${lessons.length}` : `Lesson ${currentLessonIndex + 1} of ${lessons.length}`}
                  </span>
                  
                  {/* AI Simplify button */}
                  <button
                    onClick={handleSimplifyWithAI}
                    className="inline-flex items-center gap-1.5 bg-[#18392B] hover:bg-[#244f3d] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD5C8]" />
                    <span>{getText('aiSimplifyBtn', currentLang)}</span>
                  </button>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#18392B] tracking-tight">
                  {getContentText(currentLesson.title, currentLang)}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                  {getContentText(currentLesson.summary, currentLang)}
                </p>

                {/* Original Language Notice Banner when lesson text is in original Hindi/English */}
                {!hasNativeContent && (
                  <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950 mb-0.5">
                        मूल पाठ सामग्री (Original Audio & Content: Hindi / English)
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        {getText('course_content_notice', currentLang)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Google Drive Video Player */}
              {(currentLesson.driveFileId || currentLesson.videoUrl) && (() => {
                const fileId = currentLesson.driveFileId || (() => {
                  const match = currentLesson.videoUrl?.match(/\/d\/([a-zA-Z0-9_-]+)/);
                  return match ? match[1] : null;
                })();

                const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : currentLesson.videoUrl;

                return (
                  <div className="mb-8 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                      <span className="flex items-center gap-1.5 text-[#18392B]">
                        <Video className="w-4 h-4 text-[#E07A5F]" />
                        <span>{currentLang === 'hi' ? 'वीडियो व्याख्यान (Google Drive Player)' : 'Video Lecture (Google Drive Player)'}</span>
                      </span>
                      {currentLesson.videoUrl && (
                        <a
                          href={currentLesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#E07A5F] hover:underline inline-flex items-center gap-1"
                        >
                          <span>{currentLang === 'hi' ? 'ड्राइव में खोलें' : 'Open in Drive'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/90 border border-gray-200 shadow-sm">
                      {previewUrl ? (
                        <iframe
                          src={previewUrl}
                          title={getContentText(currentLesson.title, currentLang)}
                          className="w-full h-full border-0"
                          allow="autoplay"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                          <Video className="w-8 h-8 mb-2" />
                          <p className="text-xs">{currentLang === 'hi' ? 'वीडियो लिंक उपलब्ध नहीं है।' : 'Video stream unavailable.'}</p>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-500 italic bg-[#FBF9F5] p-2.5 rounded-xl border border-gray-100 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#E07A5F] shrink-0 mt-0.5" />
                      <span>
                        {currentLang === 'hi'
                          ? 'सूचना: यदि वीडियो लोड नहीं हो रहा है, तो कृपया सुनिश्चित करें कि व्यवस्थापक ने Google Drive में वीडियो अनुमति "Anyone with the link can view" पर सेट की है।'
                          : 'Note: If the video fails to load, ensure the file permission in Google Drive is set to "Anyone with the link can view".'}
                      </span>
                    </p>
                  </div>
                );
              })()}

              {/* Lesson Story / Case Study Box */}
              {lessonContent.storyExample && (
                <div className="bg-[#FBF9F5] border-l-4 border-[#E07A5F] p-4 sm:p-5 rounded-r-2xl mb-8">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#E07A5F] uppercase tracking-wider mb-1">
                    <Lightbulb className="w-4 h-4" />
                    <span>{lessonContent.storyExample.title}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed italic">
                    "{lessonContent.storyExample.story}"
                  </p>
                  <p className="text-[11px] font-bold text-[#18392B] mt-2 text-right">
                    — {lessonContent.storyExample.character}
                  </p>
                </div>
              )}

              {/* Detailed Educational Sections */}
              <div className="space-y-6 mb-8 text-gray-800">
                {lessonContent.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <h3 className="font-bold text-base sm:text-lg text-[#18392B]">
                      {section.heading}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {section.body}
                    </p>
                    {section.tip && (
                      <div className="bg-[#E8ECE9]/60 p-3 rounded-xl border border-[#8DA399]/30 text-xs text-[#18392B] font-medium flex items-start gap-2">
                        <span className="font-bold text-[#E07A5F] shrink-0">💡 {currentLang === 'hi' ? 'सखी टिप:' : 'Sakhi Tip:'}</span>
                        <span>{section.tip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Hands-on Practical Activity */}
              {lessonContent.practicalActivity && (
                <div className="bg-[#18392B] text-white p-5 sm:p-6 rounded-2xl mb-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck className="w-5 h-5 text-[#E07A5F]" />
                    <h4 className="font-bold text-sm sm:text-base text-white">
                      {lessonContent.practicalActivity.title}
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#E8ECE9]">
                    {lessonContent.practicalActivity.instructions.map((inst, iIdx) => (
                      <li key={iIdx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#244f3d] flex items-center justify-center font-bold text-[10px] text-[#FFD5C8] shrink-0 mt-0.5">
                          {iIdx + 1}
                        </span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Takeaways */}
              {lessonContent.keyTakeaways && (
                <div className="bg-amber-50/70 border border-amber-200/60 p-5 rounded-2xl mb-8">
                  <h4 className="font-bold text-xs sm:text-sm text-amber-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-600" />
                    <span>{getText('keyTakeawaysTitle', currentLang)}</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {lessonContent.keyTakeaways.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Completion Action */}
              <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={() => onMarkLessonComplete(currentLesson.id)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isCurrentLessonCompleted
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-[#18392B] hover:bg-[#244f3d] text-white shadow-sm'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {isCurrentLessonCompleted 
                      ? getText('lessonCompleted', currentLang) 
                      : getText('markComplete', currentLang)}
                  </span>
                </button>

                {/* Next / Prev Navigation */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    onClick={handlePrevLesson}
                    disabled={currentLessonIndex === 0}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{getText('prevLesson', currentLang)}</span>
                  </button>

                  {currentLessonIndex < lessons.length - 1 ? (
                    <button
                      onClick={handleNextLesson}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-[#E07A5F] hover:bg-[#d66b50] text-white flex items-center gap-1 shadow-sm"
                    >
                      <span>{getText('nextLesson', currentLang)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartQuiz(course.id)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-sm"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{getText('takeQuiz', currentLang)}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI SIMPLIFY MODAL */}
      {showSimplifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowSimplifyModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#E07A5F]/20 flex items-center justify-center text-[#E07A5F]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#18392B]">
                  {currentLang === 'hi' ? 'सखी AI: सरल व्याख्या' : 'Sakhi AI: Simplified Explanation'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {getContentText(currentLesson.title, currentLang)}
                </p>
              </div>
            </div>

            {simplifying ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-[#18392B] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-600 font-medium">
                  {currentLang === 'hi'
                    ? 'सखी आपके लिए सरल घरेलू उदाहरण तैयार कर रही हैं...'
                    : 'Sakhi is formulating a simplified regional explanation...'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#FBF9F5] p-5 rounded-2xl border border-gray-200/70 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                  {simplifiedContent}
                </div>

                <div className="text-[11px] text-gray-500 italic bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  {getText('aiDisclaimer', currentLang)}
                </div>

                <button
                  onClick={() => setShowSimplifyModal(false)}
                  className="w-full py-2.5 bg-[#18392B] text-white text-xs font-bold rounded-xl"
                >
                  {currentLang === 'hi' ? 'समझ आ गया, धन्यवाद!' : 'Understood, Thank You!'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
