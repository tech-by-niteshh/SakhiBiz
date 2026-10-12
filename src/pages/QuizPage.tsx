import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Award, 
  RotateCcw, 
  HelpCircle,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { Course, QuizQuestion, Language, QuizAttempt } from '../types';
import { getText, getContentText } from '../utils/translations';

interface QuizPageProps {
  course: Course;
  currentLang: Language;
  onQuizComplete: (attempt: QuizAttempt) => void;
  onNavigate: (tab: string, courseId?: string) => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  course,
  currentLang,
  onQuizComplete,
  onNavigate,
}) => {
  const quiz = course.quiz;
  const questions = quiz.questions;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const currentQuestion: QuizQuestion = questions[currentQuestionIndex];
  const isSelected = selectedAnswers[currentQuestionIndex] !== undefined;

  const handleSelectOption = (optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: optionIndex,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    const answersArray: number[] = [];

    questions.forEach((q, idx) => {
      const ans = selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1;
      answersArray.push(ans);
      if (ans === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / questions.length) * 100);
    const passed = scorePercent >= quiz.passingScorePercent;

    const attempt: QuizAttempt = {
      id: `qa-${Date.now()}`,
      courseId: course.id,
      date: new Date().toISOString(),
      scorePercent,
      passed,
      totalQuestions: questions.length,
      correctCount,
      answers: answersArray,
    };

    onQuizComplete(attempt);
    setSubmitted(true);
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setReviewMode(false);
    setCurrentQuestionIndex(0);
  };

  // Calculate results if submitted
  let correctCount = 0;
  if (submitted) {
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionIndex) {
        correctCount++;
      }
    });
  }
  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= quiz.passingScorePercent;

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('learn', course.id)}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#18392B] hover:text-[#E07A5F] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentLang === 'hi' ? 'पाठ पर वापस जाएं' : 'Back to Lesson'}</span>
        </button>

        {/* RESULTS SCREEN */}
        {submitted && !reviewMode ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm text-center space-y-6">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
              passed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <Award className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#E07A5F]">
                {getContentText(course.title, currentLang)}
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#18392B] mt-1">
                {passed ? getText('quizPassed', currentLang) : getText('quizFailed', currentLang)}
              </h1>
            </div>

            {/* Score Ring / Card */}
            <div className="bg-[#FBF9F5] max-w-xs mx-auto p-6 rounded-2xl border border-gray-200/80">
              <span className="text-xs text-gray-500 font-medium block">
                {getText('quizScore', currentLang)}
              </span>
              <p className={`font-serif text-4xl font-extrabold my-1 ${
                passed ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {scorePercent}%
              </p>
              <p className="text-xs text-gray-600">
                {correctCount} / {questions.length} {currentLang === 'hi' ? 'सही उत्तर' : 'correct answers'}
              </p>
            </div>

            {passed && (
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-4 rounded-xl text-xs max-w-md mx-auto">
                <span className="font-bold block text-sm mb-1">
                  🏅 {currentLang === 'hi' ? 'बैज अनलॉक हुआ:' : 'Badge Unlocked:'} {getContentText(course.badgeTitle, currentLang)}
                </span>
                {currentLang === 'hi'
                  ? 'यह उपलब्धि आपके डैशबोर्ड में जुड़ गई है। बहुत-बहुत बधाई!'
                  : 'This verified completion badge has been added to your Learner Dashboard!'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setReviewMode(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#18392B] hover:bg-[#244f3d] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {currentLang === 'hi' ? 'उत्तरों की समीक्षा करें (Review Answers)' : 'Review Answers'}
              </button>

              <button
                onClick={handleRetake}
                className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{getText('retakeQuiz', currentLang)}</span>
              </button>

              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#E07A5F] hover:bg-[#d66b50] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {currentLang === 'hi' ? 'डैशबोर्ड देखें' : 'Go to Dashboard'}
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE QUIZ OR REVIEW MODE */
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            {/* Header */}
            <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#E07A5F] uppercase tracking-wider">
                  {getContentText(quiz.title, currentLang)}
                </span>
                <h2 className="font-serif text-lg font-bold text-[#18392B]">
                  {currentLang === 'hi'
                    ? `प्रश्न ${currentQuestionIndex + 1} / ${questions.length}`
                    : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                </h2>
              </div>

              {reviewMode && (
                <button
                  onClick={() => setReviewMode(false)}
                  className="text-xs font-bold text-[#18392B] bg-[#E8ECE9] px-3 py-1.5 rounded-lg"
                >
                  {currentLang === 'hi' ? 'परिणाम पर लौटें' : 'Back to Results'}
                </button>
              )}
            </div>

            {/* Verified Quiz Notice when options are preserved in Hindi/English */}
            {!currentQuestion.options[currentLang] && (
              <div className="mb-4 px-3.5 py-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {currentLang === 'hi'
                    ? 'सटीकता बनाए रखने के लिए यह प्रश्न प्रमाणित मूल भाषा में प्रस्तुत किया गया है।'
                    : 'Questions and options are presented in certified authentic language to preserve verified correctness.'}
                </span>
              </div>
            )}

            {/* Question Text */}
            <div className="mb-6">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-snug">
                {getContentText(currentQuestion.question, currentLang, 'hi')}
              </h3>
            </div>

            {/* Options list */}
            <div className="space-y-3 mb-8">
              {((currentQuestion.options as any)[currentLang] || currentQuestion.options.hi || currentQuestion.options.en || []).map((opt: string, optIdx: number) => {
                const userSelected = selectedAnswers[currentQuestionIndex] === optIdx;
                const isCorrect = currentQuestion.correctOptionIndex === optIdx;

                let optionStyle = 'border-gray-200 hover:border-gray-300 bg-white text-gray-800';

                if (reviewMode) {
                  if (isCorrect) {
                    optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                  } else if (userSelected && !isCorrect) {
                    optionStyle = 'border-rose-500 bg-rose-50 text-rose-900';
                  }
                } else if (userSelected) {
                  optionStyle = 'border-[#18392B] bg-[#E8ECE9]/70 text-[#18392B] font-semibold ring-2 ring-[#18392B]/20';
                }

                return (
                  <button
                    key={optIdx}
                    disabled={reviewMode}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${optionStyle}`}
                  >
                    <span className="w-5 h-5 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt}</span>
                    {reviewMode && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {reviewMode && userSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box during review mode */}
            {reviewMode && (
              <div className="bg-blue-50 border border-blue-200/80 p-4 rounded-2xl mb-6 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold block mb-1">
                  💡 {getText('explanation', currentLang)}:
                </span>
                {getContentText(currentQuestion.explanation, currentLang, 'hi')}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {getText('prevLesson', currentLang)}
              </button>

              <div className="flex gap-2">
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="px-5 py-2 bg-[#18392B] hover:bg-[#244f3d] text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {getText('nextLesson', currentLang)}
                  </button>
                ) : reviewMode ? (
                  <button
                    onClick={() => setReviewMode(false)}
                    className="px-5 py-2 bg-[#E07A5F] text-white rounded-xl text-xs font-bold"
                  >
                    {currentLang === 'hi' ? 'पूर्ण करें' : 'Finish Review'}
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(selectedAnswers).length === 0}
                    className="px-6 py-2.5 bg-[#E07A5F] hover:bg-[#d66b50] text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                  >
                    {getText('submitAnswers', currentLang)}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
