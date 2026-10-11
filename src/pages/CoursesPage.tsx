import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  Star, 
  Play, 
  ArrowRight, 
  Bookmark, 
  CheckCircle2,
  Sparkles,
  Globe
} from 'lucide-react';
import { Language, Course } from '../types';
import { getText, getContentText } from '../utils/translations';
import { COURSES_DATA } from '../data/courses';

interface CoursesPageProps {
  currentLang: Language;
  onNavigate: (tab: string, courseId?: string) => void;
  onEnroll: (courseId: string) => void;
  enrolledCourseIds: string[];
  savedCourseIds: string[];
  onToggleSave: (courseId: string) => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({
  currentLang,
  onNavigate,
  onEnroll,
  enrolledCourseIds,
  savedCourseIds,
  onToggleSave,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const categories = [
    { id: 'all', label: getText('category_all', currentLang) },
    { id: 'pricing_profit', label: getText('category_pricing_profit', currentLang) },
    { id: 'digital_payments', label: getText('category_digital_payments', currentLang) },
    { id: 'digital_marketing', label: getText('category_digital_marketing', currentLang) },
    { id: 'government_schemes', label: getText('category_government_schemes', currentLang) },
    { id: 'financial_literacy', label: getText('category_financial_literacy', currentLang) },
    { id: 'business_planning', label: getText('category_business_planning', currentLang) },
  ];

  const filteredCourses = useMemo(() => {
    return COURSES_DATA.filter((course) => {
      // Category filter
      if (selectedCategory !== 'all' && course.category !== selectedCategory) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'all' && course.level !== selectedLevel) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = 
          (course.title.hi && course.title.hi.toLowerCase().includes(query)) ||
          (course.title.en && course.title.en.toLowerCase().includes(query)) ||
          (course.title[currentLang] && course.title[currentLang].toLowerCase().includes(query));
        const descMatch = 
          (course.shortDescription.hi && course.shortDescription.hi.toLowerCase().includes(query)) ||
          (course.shortDescription.en && course.shortDescription.en.toLowerCase().includes(query)) ||
          (course.shortDescription[currentLang] && course.shortDescription[currentLang].toLowerCase().includes(query));
        return Boolean(titleMatch || descMatch);
      }
      return true;
    });
  }, [searchTerm, selectedCategory, selectedLevel, currentLang]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#18392B] to-[#244f3d] rounded-3xl p-6 sm:p-10 text-white mb-10 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block bg-[#E07A5F]/20 text-[#FFD5C8] border border-[#E07A5F]/40 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              {currentLang === 'hi' ? '100% मुफ़्त व्यावसायिक पाठ्यक्रम' : '100% Free Regional Courses'}
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl font-extrabold tracking-tight">
              {currentLang === 'hi' ? 'कोर्स डायरेक्टरी एवं कौशल ज्ञान' : 'Explore Practical Courses'}
            </h1>
            <p className="text-xs sm:text-sm text-[#C9D6CE] mt-2 leading-relaxed">
              {currentLang === 'hi'
                ? 'कदम-दर-कदम आसान पाठ, वास्तविक घरेलू व्यापार परिदृश्य और क्विज़ के साथ सीखें।'
                : 'Step-by-step regional lessons, real grassroots micro-business scenarios, and interactive quizzes.'}
            </p>
          </div>
          {/* Subtle background circle */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none"></div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={getText('searchPlaceholder', currentLang)}
                className="w-full pl-11 pr-4 py-3 bg-white text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#18392B] focus:border-transparent outline-none shadow-sm"
              />
            </div>

            {/* Level filter */}
            <div className="sm:w-48">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                aria-label={getText('filterByLevel', currentLang)}
                className="w-full px-4 py-3 bg-white text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#18392B] focus:border-transparent outline-none shadow-sm font-medium text-gray-700"
              >
                <option value="all">{getText('allLevels', currentLang)}</option>
                <option value="Beginner">{getText('beginner', currentLang)}</option>
                <option value="Intermediate">{getText('intermediate', currentLang)}</option>
              </select>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#18392B] text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course Cards Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-700">
              {currentLang === 'hi' ? 'कोई कोर्स नहीं मिला' : 'No courses found'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {currentLang === 'hi' ? 'कृपया अपनी खोज या फ़िल्टर बदलकर दोबारा प्रयास करें।' : 'Try adjusting your search terms or filters.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedLevel('all');
              }}
              className="mt-4 px-4 py-2 bg-[#18392B] text-white text-xs font-semibold rounded-lg"
            >
              {currentLang === 'hi' ? 'सभी कोर्स देखें' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.includes(course.id);
              const isSaved = savedCourseIds.includes(course.id);

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Thumbnail & Badges */}
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      <img
                        src={course.thumbnail}
                        alt={getContentText(course.title, currentLang)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-[#18392B]/90 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-md font-medium">
                        {course.level === 'Beginner' ? getText('beginner', currentLang) : getText('intermediate', currentLang)}
                      </div>
                      
                      {/* Bookmark button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave(course.id);
                        }}
                        className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-sm transition-all ${
                          isSaved 
                            ? 'bg-[#E07A5F] text-white shadow' 
                            : 'bg-white/80 text-gray-600 hover:bg-white'
                        }`}
                        title={isSaved ? 'Saved' : 'Save course'}
                        aria-label={isSaved ? 'Saved' : 'Save course'}
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
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
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {course.rating}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-[#18392B] group-hover:text-[#E07A5F] transition-colors leading-snug mb-2">
                        {getContentText(course.title, currentLang)}
                      </h3>

                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-3">
                        {getContentText(course.shortDescription, currentLang)}
                      </p>

                      {/* Language metadata */}
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          भाषा:
                        </span>
                        {(course.languageAvailable || ['hi', 'en']).map((l) => (
                          <span
                            key={l}
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                              l === currentLang
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {l}
                          </span>
                        ))}
                      </div>

                      <div className="bg-[#FBF9F5] p-2.5 rounded-xl border border-gray-100 flex items-center gap-2 text-xs text-[#18392B] font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
                        <span className="truncate">{getContentText(course.badgeTitle, currentLang)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="p-5 pt-0">
                    <button
                      onClick={() => {
                        if (!isEnrolled) {
                          onEnroll(course.id);
                        }
                        onNavigate('learn', course.id);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        isEnrolled
                          ? 'bg-[#18392B] text-white hover:bg-[#244f3d] shadow-sm'
                          : 'bg-[#E07A5F] text-white hover:bg-[#d66b50] shadow-md'
                      }`}
                    >
                      {isEnrolled ? (
                        <>
                          <span>{getText('continueLearning', currentLang)}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{getText('enrollNow', currentLang)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
