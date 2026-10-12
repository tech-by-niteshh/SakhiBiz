import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  Calculator, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Smartphone, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Send,
  Star,
  Clock,
  Play
} from 'lucide-react';
import { Language, Course } from '../types';
import { t, getText, getContentText } from '../utils/translations';
import { COURSES_DATA } from '../data/courses';
import { LanguageSelector } from '../components/LanguageSelector';

interface LandingPageProps {
  currentLang: Language;
  onNavigate: (tab: string, courseId?: string) => void;
  onOpenAuth: () => void;
  onEnroll: (courseId: string) => void;
  enrolledCourseIds: string[];
  onLanguageChange?: (lang: Language) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentLang,
  onNavigate,
  onOpenAuth,
  onEnroll,
  enrolledCourseIds,
  onLanguageChange,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    contact: '',
    message: '',
  });

  const faqs = [
    { q: getText('faq1Q', currentLang), a: getText('faq1A', currentLang) },
    { q: getText('faq2Q', currentLang), a: getText('faq2A', currentLang) },
    { q: getText('faq3Q', currentLang), a: getText('faq3A', currentLang) },
    { q: getText('faq4Q', currentLang), a: getText('faq4A', currentLang) },
  ];

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.name || !feedbackForm.message) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackForm),
      });
    } catch {
      // safe fallback
    }
    setFeedbackSent(true);
    setFeedbackForm({ name: '', contact: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#242A27]">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#18392B] to-[#122A20] text-white pt-10 pb-20 lg:pt-16 lg:pb-28">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#E07A5F_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 bg-[#E07A5F]/20 border border-[#E07A5F]/40 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#FFD5C8]">
                  <Sparkles className="w-3.5 h-3.5 text-[#E07A5F]" />
                  <span>{getText('tagline', currentLang)}</span>
                </div>
                {onLanguageChange && (
                  <div className="flex items-center gap-2 bg-[#122A20]/90 border border-[#2d5c47] px-2.5 py-1 rounded-full text-xs">
                    <span className="text-[#A2B6AC] text-[11px] hidden sm:inline">भाषा / Language:</span>
                    <LanguageSelector
                      currentLang={currentLang}
                      onLanguageChange={onLanguageChange}
                      variant="navbar"
                      id="landing-hero-language-selector"
                    />
                  </div>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                {getText('heroTitle', currentLang)}
              </h1>

              <p className="text-base sm:text-lg text-[#C9D6CE] leading-relaxed max-w-2xl font-normal">
                {getText('heroSubtitle', currentLang)}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('courses')}
                  className="px-6 py-3.5 bg-[#E07A5F] hover:bg-[#d66b50] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm sm:text-base flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{getText('heroCtaStart', currentLang)}</span>
                </button>

                <button
                  onClick={() => onNavigate('tools')}
                  className="px-6 py-3.5 bg-[#244f3d] hover:bg-[#2c5f4b] text-white font-semibold rounded-xl border border-[#3c785f] transition-all text-sm sm:text-base flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4 text-[#FFD5C8]" />
                  <span>{getText('heroCtaTools', currentLang)}</span>
                </button>

                <button
                  onClick={() => onNavigate('assistant')}
                  className="px-5 py-3.5 bg-[#122A20] hover:bg-[#1a3d2e] text-[#FFD5C8] font-semibold rounded-xl border border-[#2d5c47] transition-all text-sm flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#E07A5F]" />
                  <span>{currentLang === 'hi' ? 'सखी AI साथी से बात करें' : 'Chat with Sakhi AI'}</span>
                </button>
              </div>

              {/* 4 Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#244f3d]">
                <div className="flex items-center gap-2 text-xs text-[#E8ECE9]">
                  <CheckCircle2 className="w-4 h-4 text-[#E07A5F] shrink-0" />
                  <span>{getContentText(t.heroTrustBadges.freeLearning, currentLang)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E8ECE9]">
                  <CheckCircle2 className="w-4 h-4 text-[#E07A5F] shrink-0" />
                  <span>{getContentText(t.heroTrustBadges.audioVideoSimple, currentLang)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E8ECE9]">
                  <CheckCircle2 className="w-4 h-4 text-[#E07A5F] shrink-0" />
                  <span>{getContentText(t.heroTrustBadges.regionalLanguages, currentLang)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E8ECE9]">
                  <CheckCircle2 className="w-4 h-4 text-[#E07A5F] shrink-0" />
                  <span>{getContentText(t.heroTrustBadges.mobileFriendly, currentLang)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Asset */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Visual Frame */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 group">
                  <img
                    src="/hero.jpg"
                    alt="Indian woman entrepreneur learning on her smartphone in a rural workshop"
                    className="w-full h-80 sm:h-96 object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // fallback to curated photography if file is loading
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

                  {/* Floating card on image */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/20 text-[#242A27]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#18392B] uppercase tracking-wider flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-[#E07A5F]" />
                        {currentLang === 'hi' ? 'सफलता की कहानी' : 'Real Case Study'}
                      </span>
                      <span className="text-[11px] bg-[#E8ECE9] text-[#18392B] px-2 py-0.5 rounded-full font-semibold">
                        +35% {currentLang === 'hi' ? 'मुनाफा' : 'Margin'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 italic">
                      {currentLang === 'hi'
                        ? '"पहले मैं सिलाई में अपनी मेहनत नहीं जोड़ती थी। सखीबिज ने मुझे सही कीमत तय करना सिखाया!"'
                        : '"I never charged for my stitching labor before. SakhiBiz taught me how to price with real profit!"'}
                    </p>
                    <p className="text-[11px] font-bold text-[#18392B] mt-1">
                      — सुनीता देवी, जयपुर (हस्तशिल्प व सिलाई)
                    </p>
                  </div>
                </div>

                {/* Decorative floating pills */}
                <div className="absolute -top-3 -right-3 bg-[#E07A5F] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                  <span>100% {currentLang === 'hi' ? 'मुफ़्त' : 'Free'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW SAKHIBIZ WORKS */}
      <section className="py-16 bg-[#FBF9F5] border-b border-[#E8ECE9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#18392B]">
              {getText('howItWorksTitle', currentLang)}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {getText('howItWorksSubtitle', currentLang)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#E8ECE9] text-[#18392B] flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-[#18392B] text-base mb-2">
                {getText('step1Title', currentLang)}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {getText('step1Desc', currentLang)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#E8ECE9] text-[#18392B] flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-[#18392B] text-base mb-2">
                {getText('step2Title', currentLang)}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {getText('step2Desc', currentLang)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#E8ECE9] text-[#18392B] flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-[#18392B] text-base mb-2">
                {getText('step3Title', currentLang)}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {getText('step3Desc', currentLang)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#E07A5F]/20 text-[#E07A5F] flex items-center justify-center font-bold text-lg mb-4">
                4
              </div>
              <h3 className="font-bold text-[#18392B] text-base mb-2">
                {getText('step4Title', currentLang)}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {getText('step4Desc', currentLang)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR COURSES SECTION */}
      <section className="py-16 bg-white border-b border-[#E8ECE9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
                {currentLang === 'hi' ? 'व्यावहारिक शिक्षा' : 'Practical Curriculum'}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#18392B] mt-1">
                {currentLang === 'hi' ? 'लोकप्रिय एवं अनुशंसित कोर्स' : 'Featured Micro-Business Courses'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('courses')}
              className="text-sm font-bold text-[#18392B] hover:text-[#E07A5F] flex items-center gap-1.5 transition-colors self-start md:self-auto"
            >
              <span>{getText('heroCtaCourses', currentLang)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {COURSES_DATA.slice(0, 3).map((course) => {
              const isEnrolled = enrolledCourseIds.includes(course.id);
              return (
                <div
                  key={course.id}
                  className="bg-[#FBF9F5] rounded-2xl overflow-hidden border border-gray-200/70 shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Thumbnail */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={course.thumbnail}
                      alt={getContentText(course.title, currentLang)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-[#18392B]/90 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-md font-medium">
                      {course.level === 'Beginner' ? getText('beginner', currentLang) : getText('intermediate', currentLang)}
                    </div>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#18392B] text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{course.rating}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {course.estimatedHours} {getText('hoursCount', currentLang)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {course.lessons.length} {getText('lessonsCount', currentLang)}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-[#18392B] group-hover:text-[#E07A5F] transition-colors leading-snug mb-2">
                        {getContentText(course.title, currentLang)}
                      </h3>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {getContentText(course.shortDescription, currentLang)}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-medium">भाषा / Content:</span>
                        {(course.languageAvailable || ['hi', 'en']).map((langCode) => (
                          <span
                            key={langCode}
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                              langCode === currentLang
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {langCode}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-200/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#18392B]">
                        {getContentText(course.badgeTitle, currentLang)}
                      </span>

                      <button
                        onClick={() => {
                          if (isEnrolled) {
                            onNavigate('learn', course.id);
                          } else {
                            onEnroll(course.id);
                            onNavigate('learn', course.id);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          isEnrolled
                            ? 'bg-[#18392B] text-white hover:bg-[#244f3d]'
                            : 'bg-[#E07A5F] text-white hover:bg-[#d66b50] shadow-sm'
                        }`}
                      >
                        {isEnrolled ? (
                          <>
                            <span>{getText('continueLearning', currentLang)}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>{getText('enrollNow', currentLang)}</span>
                            <Play className="w-3 h-3 fill-current" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BUSINESS TOOLKIT PREVIEW */}
      <section className="py-16 bg-[#E8ECE9]/50 border-b border-[#E8ECE9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
              {currentLang === 'hi' ? 'गणित का डर खत्म' : 'Zero-Math Tools'}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#18392B] mt-1">
              {getText('toolsTitle', currentLang)}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {getText('toolsSubtitle', currentLang)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tool 1 */}
            <div 
              onClick={() => onNavigate('tools')}
              className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#18392B] text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Calculator className="w-6 h-6 text-[#FFD5C8]" />
              </div>
              <h3 className="font-bold text-lg text-[#18392B] mb-2">
                {getText('tabProfitCalc', currentLang)}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                {currentLang === 'hi'
                  ? 'लागत, बिक्री मूल्य और पीस की संख्या डालें। शुद्ध मुनाफा और मार्जिन % एक सेकंड में जानें।'
                  : 'Enter unit cost, sale price, and quantity. Calculate true net profit and margin percentage in seconds.'}
              </p>
              <span className="text-xs font-bold text-[#E07A5F] group-hover:underline flex items-center gap-1">
                {currentLang === 'hi' ? 'कैलकुलेटर खोलें' : 'Open Calculator'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Tool 2 */}
            <div 
              onClick={() => onNavigate('tools')}
              className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#18392B] text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6 text-[#FFD5C8]" />
              </div>
              <h3 className="font-bold text-lg text-[#18392B] mb-2">
                {getText('tabExpenseTracker', currentLang)}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                {currentLang === 'hi'
                  ? 'कच्चा माल, किराया, पैकेजिंग और आने-जाने का दैनिक खर्च आसानी से दर्ज करें। कोई हिसाब नहीं छूटेगा।'
                  : 'Record daily purchases for raw ingredients, packaging, and freight. Track where every rupee goes.'}
              </p>
              <span className="text-xs font-bold text-[#E07A5F] group-hover:underline flex items-center gap-1">
                {currentLang === 'hi' ? 'खर्च डायरी खोलें' : 'Open Tracker'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Tool 3 */}
            <div 
              onClick={() => onNavigate('tools')}
              className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#18392B] text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 text-[#FFD5C8]" />
              </div>
              <h3 className="font-bold text-lg text-[#18392B] mb-2">
                {getText('tabDigitalSafety', currentLang)}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                {currentLang === 'hi'
                  ? 'UPI PIN नियम, फर्जी स्क्रीनशॉट की पहचान और बैंक धोखाधड़ी से बचाव की संपूर्ण चेकलिस्ट।'
                  : 'UPI PIN rules, fake payment screenshot verification, and scam alert checklist to guard your earnings.'}
              </p>
              <span className="text-xs font-bold text-[#E07A5F] group-hover:underline flex items-center gap-1">
                {currentLang === 'hi' ? 'सुरक्षा गाइड देखें' : 'View Safety Guide'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ILLUSTRATIVE IMPACT METRICS */}
      <section className="py-16 bg-[#18392B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-white">
              {getText('impactTitle', currentLang)}
            </h2>
            <p className="text-sm text-[#C9D6CE] mt-2">
              {getText('impactSubtitle', currentLang)}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="bg-[#122A20] p-6 rounded-2xl border border-[#244f3d]">
              <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#E07A5F]">
                {getText('stat1Number', currentLang)}
              </p>
              <p className="text-xs sm:text-sm text-[#C9D6CE] mt-1">
                {getText('stat1Label', currentLang)}
              </p>
            </div>

            <div className="bg-[#122A20] p-6 rounded-2xl border border-[#244f3d]">
              <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#E07A5F]">
                {getText('stat2Number', currentLang)}
              </p>
              <p className="text-xs sm:text-sm text-[#C9D6CE] mt-1">
                {getText('stat2Label', currentLang)}
              </p>
            </div>

            <div className="bg-[#122A20] p-6 rounded-2xl border border-[#244f3d]">
              <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#E07A5F]">
                {getText('stat3Number', currentLang)}
              </p>
              <p className="text-xs sm:text-sm text-[#C9D6CE] mt-1">
                {getText('stat3Label', currentLang)}
              </p>
            </div>

            <div className="bg-[#122A20] p-6 rounded-2xl border border-[#244f3d]">
              <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#E07A5F]">
                {getText('stat4Number', currentLang)}
              </p>
              <p className="text-xs sm:text-sm text-[#C9D6CE] mt-1">
                {getText('stat4Label', currentLang)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SAMPLE TESTIMONIALS */}
      <section className="py-16 bg-[#FBF9F5] border-b border-[#E8ECE9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#18392B]">
              {getText('testimonialsTitle', currentLang)}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {getText('testimonialsSubtitle', currentLang)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm relative">
              <span className="text-4xl text-[#E07A5F]/40 font-serif leading-none absolute top-4 left-4">“</span>
              <p className="text-sm sm:text-base text-gray-700 italic relative z-10 leading-relaxed mb-6 pt-2">
                {getText('testimonial1Quote', currentLang)}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#18392B] text-white flex items-center justify-center font-bold text-sm">
                  स
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#18392B]">
                    {getText('testimonial1Name', currentLang)}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {getText('testimonial1Role', currentLang)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm relative">
              <span className="text-4xl text-[#E07A5F]/40 font-serif leading-none absolute top-4 left-4">“</span>
              <p className="text-sm sm:text-base text-gray-700 italic relative z-10 leading-relaxed mb-6 pt-2">
                {getText('testimonial2Quote', currentLang)}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E07A5F] text-white flex items-center justify-center font-bold text-sm">
                  फ
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#18392B]">
                    {getText('testimonial2Name', currentLang)}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {getText('testimonial2Role', currentLang)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section className="py-16 bg-white border-b border-[#E8ECE9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#18392B]">
              {getText('faqTitle', currentLang)}
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-5 py-4 text-left font-bold text-sm sm:text-base text-[#18392B] flex items-center justify-between bg-[#FBF9F5] hover:bg-[#f5f1ea] transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-[#E07A5F] shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 py-4 bg-white text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEEDBACK / CONTACT FORM */}
      <section className="py-16 bg-[#FBF9F5]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
                {currentLang === 'hi' ? 'आपकी आवाज़' : 'Feedback & Suggestions'}
              </span>
              <h3 className="font-serif text-2xl font-extrabold text-[#18392B] mt-1">
                {currentLang === 'hi' ? 'सखीबिज के लिए आपका सुझाव' : 'Share Feedback with SakhiBiz'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {currentLang === 'hi'
                  ? 'हम महिला उद्यमियों के अनुभव को और बेहतर बनाने के लिए आपकी सलाह का स्वागत करते हैं।'
                  : 'We are continually improving regional learning experiences for grassroots entrepreneurs.'}
              </p>
            </div>

            {feedbackSent ? (
              <div className="bg-[#E8ECE9] text-[#18392B] p-6 rounded-2xl text-center space-y-2 border border-[#8DA399]/40">
                <CheckCircle2 className="w-8 h-8 text-[#18392B] mx-auto" />
                <h4 className="font-bold text-base">
                  {currentLang === 'hi' ? 'धन्यवाद! आपका सुझाव प्राप्त हुआ।' : 'Thank you! Your feedback has been received.'}
                </h4>
                <p className="text-xs text-gray-600">
                  {currentLang === 'hi'
                    ? 'हमारी टीम आपके सुझावों पर निरंतर कार्य कर रही है।'
                    : 'Our development team appreciates your insights.'}
                </p>
                <button
                  onClick={() => setFeedbackSent(false)}
                  className="mt-3 px-4 py-1.5 text-xs font-semibold bg-[#18392B] text-white rounded-lg"
                >
                  {currentLang === 'hi' ? 'दूसरा संदेश भेजें' : 'Send another note'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {getText('nameLabel', currentLang)} *
                    </label>
                    <input
                      type="text"
                      required
                      value={feedbackForm.name}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                      placeholder={currentLang === 'hi' ? 'सुनीता शर्मा' : 'Sunita Sharma'}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#18392B] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {currentLang === 'hi' ? 'मोबाइल नंबर / ईमेल' : 'Mobile / Email'}
                    </label>
                    <input
                      type="text"
                      value={feedbackForm.contact}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, contact: e.target.value })}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#18392B] focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentLang === 'hi' ? 'आपका सुझाव या प्रश्न' : 'Your Suggestion or Question'} *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                    placeholder={currentLang === 'hi' ? 'मुझे सिलाई में कपड़ों के नाप और जीएसटी के बारे में भी सीखना है...' : 'I would like to learn more about packaging and pricing...'}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#18392B] focus:border-transparent outline-none resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#18392B] hover:bg-[#244f3d] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{currentLang === 'hi' ? 'सुझाव सबमिट करें' : 'Submit Feedback'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
