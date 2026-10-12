import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  BookOpen,
  Mail,
  FileText,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Video,
  Play,
  Check,
  Info,
  Lock,
  ChevronRight,
  Database,
  Layers,
  Sparkles,
  ArrowRight,
  Cpu,
  Key,
  Sliders,
  Zap,
  Activity,
  Clock,
} from 'lucide-react';
import { UserProfile, Language, Course, Lesson } from '../types';
import {
  AdminService,
  AdminUserRecord,
  AdminAiKeyItem,
  AdminAiProviderConfig,
  AdminAiMetrics,
} from '../services/adminService';
import { COURSES_DATA } from '../data/courses';
import { SUPPORTED_LANGUAGES } from '../utils/translations';

interface AdminPageProps {
  user: UserProfile;
  currentLang: Language;
  onNavigate: (tab: string, courseId?: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ user, currentLang, onNavigate }) => {
  const isAuthorized = user.role === 'ADMIN' || user.role === 'MODERATOR';
  const isAdmin = user.role === 'ADMIN';

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'courses' | 'users' | 'emails' | 'ai_settings' | 'logs'
  >('overview');

  // AI Provider & Multi-Key State (Admin Only)
  const [aiKeys, setAiKeys] = useState<AdminAiKeyItem[]>([]);
  const [aiConfigs, setAiConfigs] = useState<{
    groq: AdminAiProviderConfig;
    gemini: AdminAiProviderConfig;
  }>({
    groq: {
      provider: 'groq',
      preferredModel: 'llama-3.3-70b-versatile',
      supportedModels: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
      ],
      maxRequestsPerMinute: 60,
      maxDailyRequests: 10000,
      retryBudget: 3,
      timeoutMs: 8000,
    },
    gemini: {
      provider: 'gemini',
      preferredModel: 'gemini-2.5-flash',
      supportedModels: [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ],
      maxRequestsPerMinute: 60,
      maxDailyRequests: 5000,
      retryBudget: 3,
      timeoutMs: 8000,
    },
  });
  const [aiMetrics, setAiMetrics] = useState<AdminAiMetrics | null>(null);
  const [selectedAiProvider, setSelectedAiProvider] = useState<'groq' | 'gemini'>('groq');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyProject, setNewKeyProject] = useState('');
  const [newKeyOrg, setNewKeyOrg] = useState('');
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; latencyMs: number; message: string; modelUsed: string }>
  >({});
  const [aiConfigForm, setAiConfigForm] = useState({
    preferredModel: 'llama-3.3-70b-versatile',
    maxRequestsPerMinute: 60,
    maxDailyRequests: 10000,
    retryBudget: 3,
    timeoutMs: 8000,
  });

  // Status & Metrics
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState({
    mongoConnected: false,
    sheetsConnected: false,
    geminiConfigured: false,
  });

  // Courses & Lessons Management
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<any | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    courseId: '',
    titleHi: '',
    titleEn: '',
    descriptionHi: '',
    descriptionEn: '',
    category: 'financial_management',
    language: 'bilingual',
    languageAvailable: ['hi', 'en'] as string[],
    thumbnailUrl: '',
    published: true,
  });
  const [lessonFormData, setLessonFormData] = useState({
    lessonId: '',
    courseId: '',
    titleHi: '',
    titleEn: '',
    summaryHi: '',
    summaryEn: '',
    durationMinutes: 15,
    order: 1,
    videoUrl: '',
    driveFileId: '',
    published: true,
  });
  const [driveParsedPreview, setDriveParsedPreview] = useState<{
    fileId?: string;
    previewUrl?: string;
    normalizedUrl?: string;
    embedHtml?: string;
  } | null>(null);
  const [parsingDrive, setParsingDrive] = useState(false);

  // Users Table
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);

  // Email Campaigns
  const [emailRecipientGroup, setEmailRecipientGroup] = useState('all');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailPreviewStats, setEmailPreviewStats] = useState<any | null>(null);
  const [isEmailConfirmOpen, setIsEmailConfirmOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Clear notification banners
  const clearNotifications = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // 1. Fetch Stats & Overview
  const fetchStats = useCallback(async () => {
    try {
      const data = await AdminService.getStats();
      if (data) {
        setStats(data.stats);
        setSystemHealth({
          mongoConnected: !!data.mongoConnected,
          sheetsConnected: !!data.sheetsConnected,
          geminiConfigured: !!data.geminiConfigured,
        });
      }
    } catch (err: any) {
      console.warn('Could not fetch admin stats:', err);
    }
  }, []);

  // 2. Fetch Courses
  const fetchCourses = useCallback(async () => {
    try {
      const data = await AdminService.getCourses();
      if (data && data.length > 0) {
        setCourses(data);
      } else {
        // Fallback to local curriculum if Sheets returns empty
        setCourses(
          COURSES_DATA.map((c) => ({
            courseId: c.id,
            title: c.title.hi,
            description: c.shortDescription.hi,
            category: c.category,
            language: 'bilingual',
            published: true,
            lessonsCount: c.lessons.length,
            lessons: c.lessons,
          }))
        );
      }
    } catch (err) {
      console.warn('Error fetching courses:', err);
    }
  }, []);

  // 3. Fetch Users
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await AdminService.getUsers({
        page: userPage,
        limit: 10,
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
      });
      if (res && res.users) {
        setUsersList(res.users);
        setUserTotalPages(res.pagination.totalPages || 1);
        setUserTotalCount(res.pagination.total || 0);
      }
    } catch (err: any) {
      console.warn('Error fetching users:', err);
    }
  }, [isAdmin, userPage, userSearch, userRoleFilter, userStatusFilter]);

  // 4. Fetch Emails & Logs
  const fetchEmailsAndLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [eLogs, aLogs] = await Promise.all([
        AdminService.getEmailLogs(),
        AdminService.getActivityLogs(),
      ]);
      setEmailLogs(eLogs || []);
      setActivityLogs(aLogs || []);
    } catch (err) {
      console.warn('Error loading logs:', err);
    }
  }, [isAdmin]);

  // Fetch AI Settings & Key Registry
  const fetchAiSettings = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await AdminService.getAiOverview();
      if (data && data.success) {
        setAiKeys(data.keys || []);
        if (data.configs) {
          setAiConfigs(data.configs);
          if (data.configs[selectedAiProvider]) {
            setAiConfigForm({
              preferredModel: data.configs[selectedAiProvider].preferredModel,
              maxRequestsPerMinute: data.configs[selectedAiProvider].maxRequestsPerMinute,
              maxDailyRequests: data.configs[selectedAiProvider].maxDailyRequests,
              retryBudget: data.configs[selectedAiProvider].retryBudget,
              timeoutMs: data.configs[selectedAiProvider].timeoutMs,
            });
          }
        }
        if (data.metrics) {
          setAiMetrics(data.metrics);
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch AI settings:', err);
    }
  }, [isAdmin, selectedAiProvider]);

  const handleAddAiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;
    setActionLoading(true);
    clearNotifications();
    try {
      const res = await AdminService.addAiKeys(selectedAiProvider, newKeyInput, {
        projectId: newKeyProject || undefined,
        orgId: newKeyOrg || undefined,
      });
      if (res.success) {
        setSuccessMsg(
          `Successfully registered ${res.added} key(s) for ${selectedAiProvider.toUpperCase()} (${res.skipped} skipped duplicates).`
        );
        setNewKeyInput('');
        fetchAiSettings();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add keys');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAiKey = async (key: AdminAiKeyItem) => {
    setActionLoading(true);
    clearNotifications();
    try {
      await AdminService.updateAiKey(key.id, { enabled: !key.enabled });
      setSuccessMsg(`Key ${key.maskedKey} ${!key.enabled ? 'enabled' : 'disabled'}.`);
      fetchAiSettings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAiKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;
    setActionLoading(true);
    clearNotifications();
    try {
      await AdminService.deleteAiKey(keyId);
      setSuccessMsg('API key removed from store.');
      fetchAiSettings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestAiKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    clearNotifications();
    try {
      const res = await AdminService.testAiKey(keyId);
      setTestResults((prev) => ({ ...prev, [keyId]: res }));
      if (res.success) {
        setSuccessMsg(`Test passed: ${res.latencyMs}ms using ${res.modelUsed}`);
      } else {
        setErrorMsg(`Test failed: ${res.message}`);
      }
      fetchAiSettings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Connectivity probe error');
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleSaveAiConfig = async () => {
    setActionLoading(true);
    clearNotifications();
    try {
      const res = await AdminService.updateAiProviderConfig(selectedAiProvider, aiConfigForm);
      if (res.success) {
        setSuccessMsg(`Saved provider configuration for ${selectedAiProvider.toUpperCase()}`);
        fetchAiSettings();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save configuration');
    } finally {
      setActionLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!isAuthorized) return;
    setLoading(true);
    Promise.all([
      fetchStats(),
      fetchCourses(),
      isAdmin ? fetchUsers() : Promise.resolve(),
      isAdmin ? fetchEmailsAndLogs() : Promise.resolve(),
      isAdmin ? fetchAiSettings() : Promise.resolve(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [isAuthorized, isAdmin, fetchStats, fetchCourses, fetchUsers, fetchEmailsAndLogs, fetchAiSettings]);

  // Handle Drive Link Parse Test
  const handleParseDriveLink = async (url: string) => {
    if (!url.trim()) {
      setDriveParsedPreview(null);
      return;
    }
    setParsingDrive(true);
    try {
      const result = await AdminService.parseDriveUrl(url);
      if (result && result.driveFileId) {
        setDriveParsedPreview(result);
        setLessonFormData((prev) => ({
          ...prev,
          driveFileId: result.driveFileId,
          videoUrl: result.normalizedUrl || url,
        }));
      } else {
        setDriveParsedPreview(null);
      }
    } catch (err: any) {
      setDriveParsedPreview(null);
    } finally {
      setParsingDrive(false);
    }
  };

  // Handle Course Save
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    setActionLoading(true);

    try {
      if (courseFormData.courseId) {
        await AdminService.updateCourse(courseFormData.courseId, courseFormData);
        setSuccessMsg(currentLang === 'hi' ? 'कोर्स सफलतापूर्वक अपडेट किया गया!' : 'Course updated successfully!');
      } else {
        await AdminService.createCourse({
          ...courseFormData,
          courseId: `course-${Date.now()}`,
        });
        setSuccessMsg(currentLang === 'hi' ? 'नया कोर्स सफलतापूर्वक बनाया गया!' : 'New course created successfully!');
      }
      setIsCourseModalOpen(false);
      await fetchCourses();
      await fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save course.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Course Delete
  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm(currentLang === 'hi' ? 'क्या आप वाकई इस कोर्स को हटाना चाहते हैं?' : 'Are you sure you want to delete this course?')) {
      return;
    }
    clearNotifications();
    setActionLoading(true);
    try {
      await AdminService.deleteCourse(courseId);
      setSuccessMsg(currentLang === 'hi' ? 'कोर्स हटा दिया गया।' : 'Course deleted.');
      await fetchCourses();
      await fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete course.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Lesson Save
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    setActionLoading(true);

    try {
      if (lessonFormData.lessonId) {
        await AdminService.updateLesson(lessonFormData.lessonId, lessonFormData);
        setSuccessMsg(currentLang === 'hi' ? 'पाठ सफलतापूर्वक अपडेट किया गया!' : 'Lesson updated successfully!');
      } else {
        await AdminService.createLesson({
          ...lessonFormData,
          lessonId: `lesson-${Date.now()}`,
          courseId: selectedCourseForLessons?.courseId || selectedCourseForLessons?.id,
        });
        setSuccessMsg(currentLang === 'hi' ? 'नया पाठ सफलतापूर्वक जोड़ा गया!' : 'New lesson created successfully!');
      }
      setIsLessonModalOpen(false);
      await fetchCourses();
      await fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save lesson.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Lesson Delete
  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm(currentLang === 'hi' ? 'क्या आप वाकई इस पाठ को हटाना चाहते हैं?' : 'Are you sure you want to delete this lesson?')) {
      return;
    }
    clearNotifications();
    setActionLoading(true);
    try {
      await AdminService.deleteLesson(lessonId);
      setSuccessMsg(currentLang === 'hi' ? 'पाठ हटा दिया गया।' : 'Lesson deleted.');
      await fetchCourses();
      await fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete lesson.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle User Role Change
  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MODERATOR' | 'USER') => {
    clearNotifications();
    try {
      await AdminService.updateUserRole(userId, newRole);
      setSuccessMsg(currentLang === 'hi' ? `भूमिका बदलकर ${newRole} कर दी गई।` : `Role updated to ${newRole}.`);
      await fetchUsers();
      await fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role.');
    }
  };

  // Handle User Status Change
  const handleStatusChange = async (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    clearNotifications();
    try {
      await AdminService.updateUserStatus(userId, newStatus);
      setSuccessMsg(currentLang === 'hi' ? `स्थिति बदलकर ${newStatus} कर दी गई।` : `User status updated to ${newStatus}.`);
      await fetchUsers();
      await fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user status.');
    }
  };

  // Handle Email Preview
  const handleEmailPreview = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const preview = await AdminService.previewEmail(emailRecipientGroup);
      setEmailPreviewStats(preview);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to calculate recipient preview.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Send Email Campaign
  const handleSendEmail = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const res = await AdminService.sendEmailAnnouncement({
        subject: emailSubject,
        body: emailBody,
        recipientGroup: emailRecipientGroup,
      });
      setSuccessMsg(
        currentLang === 'hi'
          ? `ईमेल घोषणा भेजी गई! (${res?.result?.sentCount || 0} प्राप्तकर्ता)`
          : `Email campaign dispatched successfully! (${res?.result?.sentCount || 0} recipients)`
      );
      setIsEmailConfirmOpen(false);
      setEmailSubject('');
      setEmailBody('');
      setEmailPreviewStats(null);
      await fetchEmailsAndLogs();
      await fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send email announcement.');
    } finally {
      setActionLoading(false);
    }
  };

  // If unauthorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {currentLang === 'hi' ? 'अनधिकृत पहुंच (Access Denied)' : 'Unauthorized Access'}
          </h2>
          <p className="text-sm text-gray-600">
            {currentLang === 'hi'
              ? 'इस पृष्ठ को देखने के लिए आपके पास व्यवस्थापक (ADMIN) या मॉडरेटर (MODERATOR) अनुमति होनी आवश्यक है।'
              : 'You require administrator or moderator credentials to view this administrative control panel.'}
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="w-full py-2.5 bg-[#18392B] hover:bg-[#244f3d] text-white rounded-xl text-sm font-semibold transition-all"
          >
            {currentLang === 'hi' ? 'मुख्य पृष्ठ पर लौटें' : 'Return to Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-[#18392B] via-[#1e4434] to-[#244f3d] rounded-3xl p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-[#E07A5F] text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user.role}
                </span>
                <span className="text-xs text-[#A2B6AC]">
                  {isAdmin
                    ? currentLang === 'hi'
                      ? 'पूर्ण प्रशासनिक अधिकार (Full Control)'
                      : 'Full Administrative Privileges'
                    : currentLang === 'hi'
                    ? 'सामग्री संपादक अधिकार (Content Editor)'
                    : 'Moderator / Content Management'}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight">
                {currentLang === 'hi' ? 'सखीबिज प्रशासनिक नियंत्रण केंद्र' : 'SakhiBiz Administration Panel'}
              </h1>
              <p className="text-xs sm:text-sm text-[#C9D6CE] max-w-2xl">
                {currentLang === 'hi'
                  ? 'MongoDB Atlas पहचान, Google Sheets CMS पाठ्यक्रम डेटा, Google Drive वीडियो लिंक एवं Apps Script ईमेल सेवाओं का प्रबंधन।'
                  : 'Manage MongoDB Atlas identity, Google Sheets CMS curriculum, Google Drive video embeds, and Apps Script email dispatches.'}
              </p>
            </div>

            {/* Health indicators & Refresh */}
            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* MongoDB */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                    systemHealth.mongoConnected
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                  }`}
                  title="MongoDB Atlas connection status"
                >
                  <Database className="w-3 h-3" />
                  <span>MongoDB</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${systemHealth.mongoConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                </div>

                {/* Google Sheets */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                    systemHealth.sheetsConnected
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                  }`}
                  title="Google Sheets Apps Script CMS connection status"
                >
                  <Layers className="w-3 h-3" />
                  <span>Sheets CMS</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${systemHealth.sheetsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </div>

                {/* Gemini AI */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                    systemHealth.geminiConfigured
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                  }`}
                  title="Gemini AI API connection status"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gemini</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${systemHealth.geminiConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </div>
              </div>

              <button
                onClick={() => {
                  fetchStats();
                  fetchCourses();
                  fetchUsers();
                  if (isAdmin) {
                    fetchEmailsAndLogs();
                    fetchAiSettings();
                  }
                }}
                disabled={loading}
                className="inline-flex items-center gap-1.5 bg-[#244f3d] hover:bg-[#2d634d] border border-[#3b7e62] px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{currentLang === 'hi' ? 'डेटा रीफ्रेश करें' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{currentLang === 'hi' ? 'डैशबोर्ड अवलोकन' : 'Overview & Metrics'}</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'courses'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{currentLang === 'hi' ? 'कोर्स एवं पाठ प्रबंधन' : 'Courses & Lessons'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'users'
                  ? 'bg-[#18392B] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{currentLang === 'hi' ? 'उपयोगकर्ता एवं भूमिकाएं' : 'Users & Roles'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('emails')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'emails'
                  ? 'bg-[#18392B] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>{currentLang === 'hi' ? 'ईमेल घोषणाएं' : 'Email Announcements'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('ai_settings');
                fetchAiSettings();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'ai_settings'
                  ? 'bg-[#18392B] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>{currentLang === 'hi' ? 'एआई प्रदाता सेटिंग्स' : 'AI Provider Settings'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'logs'
                  ? 'bg-[#18392B] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{currentLang === 'hi' ? 'ऑडिट लॉग्स' : 'Audit Logs'}</span>
            </button>
          )}
        </div>

        {/* TAB 1: OVERVIEW & METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-medium">{currentLang === 'hi' ? 'कुल पंजीकृत उपयोगकर्ता' : 'Registered Users'}</span>
                  <Users className="w-4 h-4 text-[#18392B]" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#18392B]">
                  {stats?.totalRegisteredUsers ?? '—'}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{stats?.activeUsers ?? 0} {currentLang === 'hi' ? 'सक्रिय' : 'Active'}</span>
                  <span>•</span>
                  <span>{stats?.suspendedUsers ?? 0} {currentLang === 'hi' ? 'निलंबित' : 'Suspended'}</span>
                </div>
              </div>

              {/* Published Courses */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-medium">{currentLang === 'hi' ? 'प्रकाशित पाठ्यक्रम' : 'Published Courses'}</span>
                  <BookOpen className="w-4 h-4 text-[#E07A5F]" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#E07A5F]">
                  {stats?.publishedCoursesCount ?? courses.length ?? '—'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {stats?.totalLessonsCount ?? '—'} {currentLang === 'hi' ? 'कुल पाठ (Lessons)' : 'Total Lessons'}
                </p>
              </div>

              {/* Total Enrollments */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-medium">{currentLang === 'hi' ? 'कुल नामांकन' : 'Course Enrollments'}</span>
                  <Layers className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                  {stats?.totalEnrollments ?? '—'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {currentLang === 'hi' ? 'शीट्स में दर्ज नामांकन' : 'Recorded in Sheets'}
                </p>
              </div>

              {/* Email Quota */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-medium">{currentLang === 'hi' ? 'दैनिक मेल कोटा शेष' : 'MailApp Quota Left'}</span>
                  <Mail className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700">
                  {stats?.dailyMailQuotaRemaining ?? '100+'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {currentLang === 'hi' ? 'Google Apps Script सीमा' : 'Google Apps Script quota'}
                </p>
              </div>
            </div>

            {/* Architecture Overview Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#18392B] flex items-center gap-2">
                <Database className="w-5 h-5 text-[#E07A5F]" />
                <span>{currentLang === 'hi' ? 'सिस्टम आर्किटेक्चर एवं डेटा मॉडल स्थिति' : 'System Architecture & Data Model Status'}</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#FBF9F5] rounded-xl p-4 border border-gray-200/80 space-y-2">
                  <div className="font-bold text-[#18392B] flex items-center justify-between">
                    <span>1. MongoDB Atlas</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">Auth Truth</span>
                  </div>
                  <p className="text-gray-600">
                    {currentLang === 'hi'
                      ? 'उपयोगकर्ता पहचान, हैश किए गए पासवर्ड (bcrypt), भूमिकाएं (ADMIN/MODERATOR/USER), HttpOnly JWT कुकीज़ एवं स्थिति।'
                      : 'Primary source of truth for user authentication, bcrypt password hashes, HttpOnly cookies, and RBAC roles.'}
                  </p>
                  <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                    Admins: <strong>{stats?.adminCount ?? 1}</strong> | Moderators: <strong>{stats?.moderatorCount ?? 0}</strong>
                  </div>
                </div>

                <div className="bg-[#FBF9F5] rounded-xl p-4 border border-gray-200/80 space-y-2">
                  <div className="font-bold text-[#18392B] flex items-center justify-between">
                    <span>2. Google Sheets CMS</span>
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px]">Course CMS</span>
                  </div>
                  <p className="text-gray-600">
                    {currentLang === 'hi'
                      ? 'पाठ्यक्रम, पाठ, Google Drive वीडियो URL, उपयोगकर्ता नामांकन एवं ईमेल वितरण रिकॉर्ड Apps Script के माध्यम से।'
                      : 'Course catalog, ordered lessons, video URLs, user enrollments, and dispatches via authenticated Apps Script.'}
                  </p>
                  <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                    Sheets: <strong>Users, Courses, Lessons, Enrollments, EmailLogs, ActivityLogs</strong>
                  </div>
                </div>

                <div className="bg-[#FBF9F5] rounded-xl p-4 border border-gray-200/80 space-y-2">
                  <div className="font-bold text-[#18392B] flex items-center justify-between">
                    <span>3. Google Drive Videos</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">Media CDN</span>
                  </div>
                  <p className="text-gray-600">
                    {currentLang === 'hi'
                      ? 'प्रत्येक पाठ के लिए Google Drive वीडियो लिंक या File ID। छात्रों के देखने के लिए फ़ाइल अनुमतियां "Anyone with link" होनी चाहिए।'
                      : 'Embedded Drive video players. Requires file sharing permission to be set to "Anyone with the link can view".'}
                  </p>
                  <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                    Player: <strong>Preview Embed & Standard Normalizer</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COURSES & LESSONS */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#18392B]">
                  {currentLang === 'hi' ? 'पाठ्यक्रम सूची (Google Sheets CMS)' : 'Course Catalogue (Google Sheets CMS)'}
                </h2>
                <p className="text-xs text-gray-500">
                  {currentLang === 'hi'
                    ? 'कोर्स और पाठों का विवरण बदलें, नए वीडियो लिंक जोड़ें और प्रकाशित स्थिति नियंत्रित करें।'
                    : 'Manage course metadata, lessons, Google Drive video links, and publish states.'}
                </p>
              </div>

              <button
                onClick={() => {
                  setCourseFormData({
                    courseId: '',
                    titleHi: '',
                    titleEn: '',
                    descriptionHi: '',
                    descriptionEn: '',
                    category: 'financial_management',
                    language: 'bilingual',
                    languageAvailable: ['hi', 'en'],
                    thumbnailUrl: '',
                    published: true,
                  });
                  setIsCourseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#18392B] hover:bg-[#244f3d] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{currentLang === 'hi' ? 'नया कोर्स बनाएं' : 'Create Course'}</span>
              </button>
            </div>

            {/* Courses List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBF9F5] border-b border-gray-100 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Lessons</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {courses.map((c) => {
                      const cId = c.courseId || c.id;
                      const cTitle = typeof c.title === 'object' ? c.title.hi : c.title;
                      const cDesc = typeof c.description === 'object' ? c.description.hi : c.description;
                      const isPub = c.published !== false && c.published !== 'FALSE';
                      const lessonsList = c.lessons || [];

                      return (
                        <tr key={cId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{cTitle}</div>
                            <div className="text-[11px] text-gray-500 truncate max-w-xs">{cDesc}</div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {(c.languageAvailable || ['hi', 'en']).map((langTag: string) => (
                                <span key={langTag} className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {langTag}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{cId}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono text-[10px]">
                              {c.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                isPub ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {isPub ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-700">
                            {lessonsList.length || c.lessonsCount || 0}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              onClick={() => {
                                setSelectedCourseForLessons(c);
                              }}
                              className="px-2.5 py-1 bg-[#18392B]/10 hover:bg-[#18392B]/20 text-[#18392B] rounded-lg text-xs font-semibold"
                            >
                              {currentLang === 'hi' ? 'पाठ देखें' : 'View Lessons'}
                            </button>
                            <button
                              onClick={() => {
                                setCourseFormData({
                                  courseId: cId,
                                  titleHi: typeof c.title === 'object' ? c.title.hi : c.title,
                                  titleEn: typeof c.title === 'object' ? c.title.en : '',
                                  descriptionHi: typeof c.description === 'object' ? c.description.hi : c.description,
                                  descriptionEn: typeof c.description === 'object' ? c.description.en : '',
                                  category: c.category,
                                  language: c.language || 'bilingual',
                                  languageAvailable: c.languageAvailable || ['hi', 'en'],
                                  thumbnailUrl: c.thumbnailUrl || '',
                                  published: isPub,
                                });
                                setIsCourseModalOpen(true);
                              }}
                              className="p-1 hover:bg-gray-100 text-gray-600 rounded"
                              title="Edit Course"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteCourse(cId)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                                title="Delete Course"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Course Lessons Sub-Panel */}
            {selectedCourseForLessons && (
              <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#E07A5F] uppercase tracking-wide">
                      {currentLang === 'hi' ? 'चयनित कोर्स के पाठ' : 'Lessons for Selected Course'}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#18392B]">
                      {typeof selectedCourseForLessons.title === 'object'
                        ? selectedCourseForLessons.title.hi
                        : selectedCourseForLessons.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setLessonFormData({
                          lessonId: '',
                          courseId: selectedCourseForLessons.courseId || selectedCourseForLessons.id,
                          titleHi: '',
                          titleEn: '',
                          summaryHi: '',
                          summaryEn: '',
                          durationMinutes: 15,
                          order: (selectedCourseForLessons.lessons?.length || 0) + 1,
                          videoUrl: '',
                          driveFileId: '',
                          published: true,
                        });
                        setDriveParsedPreview(null);
                        setIsLessonModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 bg-[#E07A5F] hover:bg-[#d46a50] text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{currentLang === 'hi' ? 'नया पाठ जोड़ें' : 'Add Lesson'}</span>
                    </button>
                    <button
                      onClick={() => setSelectedCourseForLessons(null)}
                      className="text-xs text-gray-500 hover:text-gray-800"
                    >
                      {currentLang === 'hi' ? 'बंद करें' : 'Close'}
                    </button>
                  </div>
                </div>

                {/* Lessons Table */}
                <div className="divide-y divide-gray-100">
                  {(selectedCourseForLessons.lessons || []).length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">
                      {currentLang === 'hi' ? 'इस कोर्स में कोई पाठ नहीं है।' : 'No lessons found for this course yet.'}
                    </p>
                  ) : (
                    selectedCourseForLessons.lessons.map((lesson: any, idx: number) => {
                      const lTitle = typeof lesson.title === 'object' ? lesson.title.hi : lesson.title;
                      const lSummary = typeof lesson.summary === 'object' ? lesson.summary.hi : lesson.summary;

                      return (
                        <div key={lesson.id || idx} className="py-3 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#18392B]/10 text-[#18392B] flex items-center justify-center font-bold text-xs">
                                {lesson.order || idx + 1}
                              </span>
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">{lTitle}</span>
                              {lesson.driveFileId || lesson.videoUrl ? (
                                <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">
                                  <Video className="w-3 h-3" />
                                  <span>Drive Video</span>
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-gray-500 pl-7">{lSummary}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setLessonFormData({
                                  lessonId: lesson.id,
                                  courseId: selectedCourseForLessons.courseId || selectedCourseForLessons.id,
                                  titleHi: typeof lesson.title === 'object' ? lesson.title.hi : lesson.title,
                                  titleEn: typeof lesson.title === 'object' ? lesson.title.en : '',
                                  summaryHi: typeof lesson.summary === 'object' ? lesson.summary.hi : lesson.summary,
                                  summaryEn: typeof lesson.summary === 'object' ? lesson.summary.en : '',
                                  durationMinutes: lesson.durationMinutes || 15,
                                  order: lesson.order || idx + 1,
                                  videoUrl: lesson.videoUrl || '',
                                  driveFileId: lesson.driveFileId || '',
                                  published: lesson.published !== false,
                                });
                                if (lesson.driveFileId) {
                                  setDriveParsedPreview({
                                    fileId: lesson.driveFileId,
                                    previewUrl: `https://drive.google.com/file/d/${lesson.driveFileId}/preview`,
                                  });
                                } else {
                                  setDriveParsedPreview(null);
                                }
                                setIsLessonModalOpen(true);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-900 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USERS & ROLES */}
        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#18392B]">
                  {currentLang === 'hi' ? 'उपयोगकर्ता एवं भूमिका प्रबंधन' : 'Users & Role Management'}
                </h2>
                <p className="text-xs text-gray-500">
                  {currentLang === 'hi'
                    ? 'MongoDB Atlas उपयोगकर्ता रिकॉर्ड। ADMIN और MODERATOR भूमिकाएं नियंत्रित करें।'
                    : 'MongoDB Atlas identity repository. Assign and revoke roles with safe admin safeguards.'}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    placeholder={currentLang === 'hi' ? 'नाम या ईमेल खोजें...' : 'Search name or email...'}
                    className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700"
                >
                  <option value="">{currentLang === 'hi' ? 'सभी भूमिकाएं' : 'All Roles'}</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="USER">USER</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700"
                >
                  <option value="">{currentLang === 'hi' ? 'सभी स्थितियां' : 'All Statuses'}</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBF9F5] border-b border-gray-100 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">User & Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Location / Category</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {currentLang === 'hi' ? 'कोई उपयोगकर्ता नहीं मिला।' : 'No users match criteria.'}
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => {
                        return (
                          <tr key={u.userId || u._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-gray-900">{u.name}</div>
                              <div className="text-gray-500 font-mono text-[11px]">{u.normalizedEmail}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                    u.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {u.emailVerified ? 'Verified' : 'Unverified'}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                    u.sheetsSynced ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {u.sheetsSynced ? 'Sheets Synced' : 'Sync Pending'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isAdmin ? (
                                <select
                                  value={u.role}
                                  onChange={(e) =>
                                    handleRoleChange(u.userId, e.target.value as 'ADMIN' | 'MODERATOR' | 'USER')
                                  }
                                  className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 bg-white"
                                >
                                  <option value="USER">USER</option>
                                  <option value="MODERATOR">MODERATOR</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-gray-100 text-gray-700">
                                  {u.role}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isAdmin ? (
                                <button
                                  onClick={() =>
                                    handleStatusChange(
                                      u.userId,
                                      u.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                                    )
                                  }
                                  className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                    u.accountStatus === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {u.accountStatus || 'ACTIVE'}
                                </button>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                    u.accountStatus === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {u.accountStatus || 'ACTIVE'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <div>{u.location || '—'}</div>
                              <div className="text-[10px] text-gray-400">{u.businessCategory || '—'}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-[10px] text-gray-400 font-mono">
                                {u.userId.slice(0, 8)}...
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Showing {usersList.length} of {userTotalCount} users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userPage <= 1}
                    className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    Page {userPage} of {userTotalPages}
                  </span>
                  <button
                    onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                    disabled={userPage >= userTotalPages}
                    className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EMAIL ANNOUNCEMENTS (ADMIN ONLY) */}
        {activeTab === 'emails' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#18392B]">
                  {currentLang === 'hi' ? 'ईमेल घोषणा अभियान (Apps Script MailApp)' : 'Email Announcement Dispatch'}
                </h2>
                <p className="text-xs text-gray-500">
                  {currentLang === 'hi'
                    ? 'Google Apps Script MailApp के माध्यम से पंजीकृत महिलाओं को आधिकारिक सूचनाएं एवं अपडेट भेजें।'
                    : 'Dispatch community updates and announcements via authenticated Google Apps Script MailApp.'}
                </p>
              </div>

              {/* Composer Form */}
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentLang === 'hi' ? 'प्राप्तकर्ता समूह' : 'Recipient Group'}
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={emailRecipientGroup}
                      onChange={(e) => {
                        setEmailRecipientGroup(e.target.value);
                        setEmailPreviewStats(null);
                      }}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="all">{currentLang === 'hi' ? 'सभी पंजीकृत उपयोगकर्ता (All Users)' : 'All Registered Users'}</option>
                      <option value="enrolled">{currentLang === 'hi' ? 'नामांकित छात्र (Enrolled in Courses)' : 'Enrolled Learners'}</option>
                      <option value="inactive">{currentLang === 'hi' ? 'निष्क्रिय उपयोगकर्ता (No recent logins)' : 'Inactive Accounts'}</option>
                      <option value="admins">{currentLang === 'hi' ? 'केवल प्रशासक और मॉडरेटर (Admins Only)' : 'Administrators & Moderators'}</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleEmailPreview}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold"
                    >
                      {currentLang === 'hi' ? 'प्राप्तकर्ता संख्या जांचें' : 'Estimate Recipients'}
                    </button>

                    {emailPreviewStats && (
                      <span className="text-xs font-bold text-[#18392B] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                        {currentLang === 'hi'
                          ? `अनुमानित: ${emailPreviewStats.estimatedRecipients} प्राप्तकर्ता (कोटा शेष: ${emailPreviewStats.dailyQuotaRemaining})`
                          : `Estimated: ${emailPreviewStats.estimatedRecipients} recipients (Quota remaining: ${emailPreviewStats.dailyQuotaRemaining})`}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentLang === 'hi' ? 'ईमेल विषय (Subject Line)' : 'Subject Line'}
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={currentLang === 'hi' ? 'उदा. सखीबिज: नया वित्तीय साक्षरता मॉड्यूल उपलब्ध है!' : 'e.g. SakhiBiz: New Financial Literacy Module Released!'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentLang === 'hi' ? 'ईमेल संदेश (Message Body)' : 'Message Body'}
                  </label>
                  <textarea
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder={currentLang === 'hi' ? 'नमस्ते उद्यमी बहनों...\n\nसखीबिज मंच पर नया अपडेट उपलब्ध है...' : 'Dear SakhiBiz Members,\n\nWe are pleased to announce...'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-normal focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!emailSubject.trim() || !emailBody.trim()) {
                        setErrorMsg('Subject and Message Body are required.');
                        return;
                      }
                      setIsEmailConfirmOpen(true);
                    }}
                    className="px-5 py-2.5 bg-[#E07A5F] hover:bg-[#d46a50] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {currentLang === 'hi' ? 'समीक्षा एवं पुष्टि करें (Review & Send)' : 'Review & Confirm Dispatch'}
                  </button>
                </div>
              </div>
            </div>

            {/* Email History Logs */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-serif text-md font-bold text-[#18392B]">
                {currentLang === 'hi' ? 'हाल के ईमेल प्रेषण लॉग (Email Logs)' : 'Recent Email Dispatch Logs'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBF9F5] border-b border-gray-100 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Campaign ID</th>
                      <th className="px-4 py-2.5">Recipient</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Sent At</th>
                      <th className="px-4 py-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {emailLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          {currentLang === 'hi' ? 'कोई हालिया ईमेल लॉग नहीं मिला।' : 'No recent email dispatches recorded.'}
                        </td>
                      </tr>
                    ) : (
                      emailLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-gray-700">{log.campaignId || log.emailLogId}</td>
                          <td className="px-4 py-2.5 text-gray-800">{log.recipientEmail}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-[11px]">{log.sentAt || '—'}</td>
                          <td className="px-4 py-2.5 text-rose-600 text-[11px]">{log.errorMessage || 'OK'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS (ADMIN ONLY) */}
        {activeTab === 'logs' && isAdmin && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#18392B]">
              {currentLang === 'hi' ? 'सिस्टम गतिविधि एवं ऑडिट लॉग्स' : 'System Activity & Audit Logs'}
            </h3>
            <p className="text-xs text-gray-500">
              {currentLang === 'hi'
                ? 'Google Sheets ActivityLogs टैब में दर्ज सभी प्रशासनिक परिवर्तन एवं सुरक्षा ऑडिट घटनाएं।'
                : 'Immutable audit trail of administrative modifications, course revisions, and access events.'}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBF9F5] border-b border-gray-100 text-gray-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Actor User</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        {currentLang === 'hi' ? 'कोई ऑडिट लॉग दर्ज नहीं है।' : 'No activity logs found.'}
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-500 text-[11px] font-mono">{log.timestamp || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-800 font-mono text-[11px]">{log.actorUserId || 'System'}</td>
                        <td className="px-4 py-2.5 font-bold text-[10px] text-gray-600">{log.actorRole || 'ADMIN'}</td>
                        <td className="px-4 py-2.5 font-bold text-[#18392B]">{log.action}</td>
                        <td className="px-4 py-2.5 text-gray-500 font-mono text-[11px]">{log.targetId || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: AI PROVIDER SETTINGS & FAILOVER (ADMIN ONLY) */}
        {activeTab === 'ai_settings' && isAdmin && (
          <div className="space-y-6">
            {/* Header & Overview */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Cpu className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-[#18392B]">
                      {currentLang === 'hi' ? 'एआई प्रदाता सेटिंग्स एवं फेलओवर प्रबंधन' : 'AI Provider Settings & Failover Engine'}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                    {currentLang === 'hi'
                      ? 'Groq एवं Google Gemini के लिए बहु-कुंजी (Multi-Key) प्रबंधन। राउंड-रॉबिन रोटेशन, 429 दर सीमा बैकऑफ़, स्वचालित फेलओवर और एईएस-256-जीसीएम एन्क्रिप्टेड स्टोरेज।'
                      : 'Configure resilient multi-key pools for Groq and Google Gemini with automatic failover, 429 rate-limit backoff, project quota pooling, and AES-256-GCM encrypted server-side storage.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchAiSettings()}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>{currentLang === 'hi' ? 'रीफ्रेश' : 'Refresh Metrics'}</span>
                  </button>
                </div>
              </div>

              {/* Metrics Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-gray-200/70 space-y-1">
                  <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Total AI Requests
                  </span>
                  <p className="text-xl font-extrabold text-[#18392B]">
                    {aiMetrics?.totalRequests ?? 0}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {aiMetrics?.successfulRequests ?? 0} succeeded • {aiMetrics?.failedRequests ?? 0} failed
                  </p>
                </div>

                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-gray-200/70 space-y-1">
                  <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Automatic Retries
                  </span>
                  <p className="text-xl font-extrabold text-amber-700">
                    {aiMetrics?.retriedRequests ?? 0}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Handled via failover budget
                  </p>
                </div>

                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-gray-200/70 space-y-1">
                  <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Groq Key Pool
                  </span>
                  <p className="text-xl font-extrabold text-[#18392B]">
                    {aiMetrics?.providers.groq.activeKeysCount ?? 0}
                    <span className="text-xs font-normal text-gray-500"> active</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {aiMetrics?.providers.groq.cooldownKeysCount ?? 0} in cooldown • {aiMetrics?.providers.groq.failedKeysCount ?? 0} invalid
                  </p>
                </div>

                <div className="bg-[#FBF9F5] p-3.5 rounded-xl border border-gray-200/70 space-y-1">
                  <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Gemini Key Pool
                  </span>
                  <p className="text-xl font-extrabold text-[#18392B]">
                    {aiMetrics?.providers.gemini.activeKeysCount ?? 0}
                    <span className="text-xs font-normal text-gray-500"> active</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {aiMetrics?.providers.gemini.cooldownKeysCount ?? 0} in cooldown • {aiMetrics?.providers.gemini.failedKeysCount ?? 0} invalid
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Switcher Bar */}
            <div className="flex border-b border-gray-200 space-x-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedAiProvider('groq');
                  const cfg = aiConfigs.groq;
                  setAiConfigForm({
                    preferredModel: cfg.preferredModel,
                    maxRequestsPerMinute: cfg.maxRequestsPerMinute,
                    maxDailyRequests: cfg.maxDailyRequests,
                    retryBudget: cfg.retryBudget,
                    timeoutMs: cfg.timeoutMs,
                  });
                }}
                className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                  selectedAiProvider === 'groq'
                    ? 'border-[#18392B] text-[#18392B] bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Groq (Ultra-Fast AI Chat)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 font-normal">
                  {aiKeys.filter((k) => k.provider === 'groq').length} keys
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedAiProvider('gemini');
                  const cfg = aiConfigs.gemini;
                  setAiConfigForm({
                    preferredModel: cfg.preferredModel,
                    maxRequestsPerMinute: cfg.maxRequestsPerMinute,
                    maxDailyRequests: cfg.maxDailyRequests,
                    retryBudget: cfg.retryBudget,
                    timeoutMs: cfg.timeoutMs,
                  });
                }}
                className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                  selectedAiProvider === 'gemini'
                    ? 'border-[#18392B] text-[#18392B] bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Google Gemini (Multimodal & Lesson Simplifier)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 font-normal">
                  {aiKeys.filter((k) => k.provider === 'gemini').length} keys
                </span>
              </button>
            </div>

            {/* Provider Configuration & Model Settings */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#18392B] flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-gray-600" />
                    {selectedAiProvider.toUpperCase()} Model & Rate Limit Safeguards
                  </h3>
                  <p className="text-xs text-gray-500">
                    Set primary model ID, request limits, and retry timeout budgets.
                  </p>
                </div>
                <button
                  onClick={handleSaveAiConfig}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#18392B] hover:bg-[#244f3d] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Preferred Model
                  </label>
                  <select
                    value={aiConfigForm.preferredModel}
                    onChange={(e) => setAiConfigForm({ ...aiConfigForm, preferredModel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-1 focus:ring-[#18392B]"
                  >
                    {(aiConfigs[selectedAiProvider]?.supportedModels || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Max Requests / Minute (RPM)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={aiConfigForm.maxRequestsPerMinute}
                    onChange={(e) =>
                      setAiConfigForm({ ...aiConfigForm, maxRequestsPerMinute: parseInt(e.target.value, 10) || 60 })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Failover Retry Budget
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={aiConfigForm.retryBudget}
                    onChange={(e) =>
                      setAiConfigForm({ ...aiConfigForm, retryBudget: parseInt(e.target.value, 10) || 3 })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Timeout Threshold (ms)
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="30000"
                    step="500"
                    value={aiConfigForm.timeoutMs}
                    onChange={(e) =>
                      setAiConfigForm({ ...aiConfigForm, timeoutMs: parseInt(e.target.value, 10) || 8000 })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>
              </div>
            </div>

            {/* Add API Keys Box */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#18392B] flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" />
                  Add {selectedAiProvider.toUpperCase()} API Keys
                </h3>
                <p className="text-xs text-gray-500">
                  Paste multiple keys separated by commas or newlines. Keys are encrypted with AES-256-GCM and never displayed in plaintext.
                </p>
              </div>

              <form onSubmit={handleAddAiKeys} className="space-y-3">
                <div>
                  <textarea
                    rows={3}
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    placeholder={
                      selectedAiProvider === 'groq'
                        ? 'gsk_key_one\ngsk_key_two\ngsk_key_three'
                        : 'AIza_key_one\nAIza_key_two\nAIza_key_three'
                    }
                    className="w-full font-mono text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B] bg-[#FBF9F5]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Project ID (Optional Quota Grouping)
                    </label>
                    <input
                      type="text"
                      value={newKeyProject}
                      onChange={(e) => setNewKeyProject(e.target.value)}
                      placeholder="e.g. proj_sakhibiz_production"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Keys with the same Project ID will share rate-limit cooldowns.
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Organization ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={newKeyOrg}
                      onChange={(e) => setNewKeyOrg(e.target.value)}
                      placeholder="e.g. org_grassroots_women"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionLoading || !newKeyInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E07A5F] hover:bg-[#d46a50] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Encrypt & Add Key(s)</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Configured Keys Table */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#18392B]">
                    Configured {selectedAiProvider.toUpperCase()} Keys ({aiKeys.filter((k) => k.provider === selectedAiProvider).length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Keys are selected in round-robin order. Cooldown and failed keys are skipped automatically.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBF9F5] border-b border-gray-100 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Masked Key</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Project / Group</th>
                      <th className="px-4 py-2.5">Last Success / Tested</th>
                      <th className="px-4 py-2.5">Error Info</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {aiKeys.filter((k) => k.provider === selectedAiProvider).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No {selectedAiProvider.toUpperCase()} keys configured yet. Paste keys above or set{' '}
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">
                            {selectedAiProvider === 'groq' ? 'GROQ_API_KEYS' : 'GEMINI_API_KEYS'}
                          </code>{' '}
                          in environment.
                        </td>
                      </tr>
                    ) : (
                      aiKeys
                        .filter((k) => k.provider === selectedAiProvider)
                        .map((key) => {
                          const isInCooldown = key.cooldownUntil && key.cooldownUntil > Date.now();
                          const cooldownRemainingSec = isInCooldown
                            ? Math.ceil((key.cooldownUntil! - Date.now()) / 1000)
                            : 0;

                          return (
                            <tr key={key.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-mono text-gray-800 font-semibold">
                                {key.maskedKey}
                              </td>

                              <td className="px-4 py-3">
                                {isInCooldown ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <Clock className="w-3 h-3 animate-pulse" />
                                    Cooldown ({cooldownRemainingSec}s)
                                  </span>
                                ) : key.status === 'ACTIVE' && key.enabled ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Active
                                  </span>
                                ) : key.status === 'FAILED' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800" title={key.lastErrorMessage}>
                                    <XCircle className="w-3 h-3" />
                                    Failed / Invalid
                                  </span>
                                ) : !key.enabled || key.status === 'DISABLED' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                    Disabled
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    {key.status}
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                                {key.projectId ? (
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                                    {key.projectId}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-gray-500 text-[11px]">
                                <div>{key.lastSuccessAt ? new Date(key.lastSuccessAt).toLocaleTimeString() : 'Never used'}</div>
                                <div className="text-[10px] text-gray-400">
                                  Checked: {key.lastCheckedAt ? new Date(key.lastCheckedAt).toLocaleTimeString() : '—'}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-[11px]">
                                {key.lastErrorCategory ? (
                                  <span className="text-rose-600 font-medium">
                                    {key.lastErrorCategory}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600">None</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleTestAiKey(key.id)}
                                    disabled={testingKeyId === key.id}
                                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                                    title="Send minimal isolated probe to verify connectivity"
                                  >
                                    {testingKeyId === key.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin inline" />
                                    ) : (
                                      'Test'
                                    )}
                                  </button>

                                  <button
                                    onClick={() => handleToggleAiKey(key)}
                                    disabled={actionLoading}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                                      key.enabled
                                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {key.enabled ? 'Disable' : 'Enable'}
                                  </button>

                                  <button
                                    onClick={() => handleDeleteAiKey(key.id)}
                                    disabled={actionLoading}
                                    className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Delete key"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Request Events Log Table */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#18392B] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Live Failover & Request Events
                </h3>
                <p className="text-xs text-gray-500">
                  Recent AI generation calls, failover retries, and error classifications.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBF9F5] border-b border-gray-100 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Provider & Model</th>
                      <th className="px-4 py-2.5">Result</th>
                      <th className="px-4 py-2.5">Retries</th>
                      <th className="px-4 py-2.5">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(aiMetrics?.recentEvents || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No recent AI events logged.
                        </td>
                      </tr>
                    ) : (
                      aiMetrics!.recentEvents.slice(0, 15).map((evt) => (
                        <tr key={evt.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2 text-gray-500 font-mono text-[11px]">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2 font-mono text-gray-800 text-[11px]">
                            <span className="font-bold text-[#18392B]">{evt.provider.toUpperCase()}</span> ({evt.model})
                          </td>
                          <td className="px-4 py-2">
                            {evt.success ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Success
                              </span>
                            ) : (
                              <span className="text-rose-700 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                {evt.errorCategory || 'Failed'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 font-mono text-[11px]">
                            {evt.retryCount > 0 ? (
                              <span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                                {evt.retryCount} retry
                              </span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 font-mono text-[11px]">
                            {evt.latencyMs > 0 ? `${evt.latencyMs}ms` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE / EDIT COURSE */}
        {isCourseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-serif text-lg font-bold text-[#18392B]">
                  {courseFormData.courseId
                    ? currentLang === 'hi' ? 'कोर्स संपादित करें' : 'Edit Course'
                    : currentLang === 'hi' ? 'नया कोर्स जोड़ें' : 'Create New Course'}
                </h3>
                <button
                  onClick={() => setIsCourseModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Title (Hindi)</label>
                  <input
                    type="text"
                    required
                    value={courseFormData.titleHi}
                    onChange={(e) => setCourseFormData({ ...courseFormData, titleHi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Title (English)</label>
                  <input
                    type="text"
                    value={courseFormData.titleEn}
                    onChange={(e) => setCourseFormData({ ...courseFormData, titleEn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Description (Hindi)</label>
                  <textarea
                    rows={3}
                    required
                    value={courseFormData.descriptionHi}
                    onChange={(e) => setCourseFormData({ ...courseFormData, descriptionHi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Category</label>
                    <select
                      value={courseFormData.category}
                      onChange={(e) => setCourseFormData({ ...courseFormData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
                    >
                      <option value="financial_management">Financial Management</option>
                      <option value="digital_marketing">Digital Marketing</option>
                      <option value="government_schemes">Government Schemes</option>
                      <option value="business_planning">Business Planning</option>
                      <option value="legal_compliance">Legal & Compliance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Published</label>
                    <select
                      value={courseFormData.published ? 'true' : 'false'}
                      onChange={(e) => setCourseFormData({ ...courseFormData, published: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
                    >
                      <option value="true">Published</option>
                      <option value="false">Draft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Thumbnail URL</label>
                  <input
                    type="url"
                    value={courseFormData.thumbnailUrl}
                    onChange={(e) => setCourseFormData({ ...courseFormData, thumbnailUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Available Languages (उपलब्ध सामग्री भाषाएँ)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FBF9F5] p-3 rounded-xl border border-gray-200">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = (courseFormData.languageAvailable || []).includes(lang.code);
                      return (
                        <label
                          key={lang.code}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#18392B] text-white border-[#18392B] font-bold'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate">{lang.nativeName}</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const curr = courseFormData.languageAvailable || ['hi', 'en'];
                              const next = e.target.checked
                                ? [...curr, lang.code]
                                : curr.filter((c) => c !== lang.code);
                              setCourseFormData({ ...courseFormData, languageAvailable: next });
                            }}
                            className="w-3.5 h-3.5 rounded text-[#E07A5F]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCourseModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#18392B] hover:bg-[#244f3d] text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CREATE / EDIT LESSON WITH GOOGLE DRIVE VIDEO */}
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-serif text-lg font-bold text-[#18392B]">
                  {lessonFormData.lessonId
                    ? currentLang === 'hi' ? 'पाठ संपादित करें' : 'Edit Lesson'
                    : currentLang === 'hi' ? 'नया पाठ जोड़ें' : 'Add New Lesson'}
                </h3>
                <button
                  onClick={() => setIsLessonModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Title (Hindi)</label>
                  <input
                    type="text"
                    required
                    value={lessonFormData.titleHi}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, titleHi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Title (English)</label>
                  <input
                    type="text"
                    value={lessonFormData.titleEn}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, titleEn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Summary (Hindi)</label>
                  <textarea
                    rows={2}
                    value={lessonFormData.summaryHi}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, summaryHi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#18392B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={lessonFormData.durationMinutes}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, durationMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Order</label>
                    <input
                      type="number"
                      min={1}
                      value={lessonFormData.order}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, order: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Google Drive Video Link Handler */}
                <div className="bg-[#FBF9F5] rounded-2xl p-4 border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <Video className="w-4 h-4 text-[#E07A5F]" />
                    <span>Google Drive Video Integration</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Paste Google Drive Share Link or File ID:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={lessonFormData.videoUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLessonFormData({ ...lessonFormData, videoUrl: val });
                          handleParseDriveLink(val);
                        }}
                        placeholder="https://drive.google.com/file/d/1a2b3c.../view?usp=sharing"
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleParseDriveLink(lessonFormData.videoUrl)}
                        disabled={parsingDrive}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs"
                      >
                        {parsingDrive ? 'Validating...' : 'Parse'}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500">
                    <Info className="w-3 h-3 inline mr-1 text-[#E07A5F]" />
                    <strong>Drive Sharing Notice:</strong> The Google Drive file must have its sharing set to{' '}
                    <strong>"Anyone with the link can view"</strong> so students can stream the video without access errors.
                  </p>

                  {/* Video Preview */}
                  {driveParsedPreview?.previewUrl && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Valid Drive ID: <code className="bg-emerald-100 px-1 py-0.5 rounded text-[10px]">{driveParsedPreview.fileId}</code>
                      </div>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/90 border border-gray-200 shadow-inner">
                        <iframe
                          src={driveParsedPreview.previewUrl}
                          title="Drive Video Preview"
                          className="w-full h-full border-0"
                          allow="autoplay"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsLessonModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#18392B] hover:bg-[#244f3d] text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Lesson'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EMAIL SEND CONFIRMATION */}
        {isEmailConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
              <div className="flex items-center gap-2 text-amber-600 border-b border-gray-100 pb-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-serif text-base font-bold text-gray-900">
                  {currentLang === 'hi' ? 'ईमेल प्रेषण की पुष्टि करें' : 'Confirm Email Dispatch'}
                </h3>
              </div>

              <div className="space-y-2 bg-[#FBF9F5] p-3 rounded-xl border border-gray-200">
                <p>
                  <strong>Recipient Group:</strong> {emailRecipientGroup}
                </p>
                <p>
                  <strong>Subject:</strong> {emailSubject}
                </p>
                <p className="text-gray-500 text-[11px]">
                  Emails are dispatched through Google Apps Script MailApp. Once sent, this action cannot be undone.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmailConfirmOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#E07A5F] hover:bg-[#d46a50] text-white rounded-xl font-bold shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Sending...' : 'Confirm & Dispatch'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
