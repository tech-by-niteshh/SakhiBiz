import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
  ArrowRight,
  MapPin,
  Globe,
  KeyRound,
  Clock,
  RotateCw,
  ArrowLeft,
} from 'lucide-react';
import { Language, UserProfile, BusinessCategory } from '../types';
import { getText, SUPPORTED_LANGUAGES } from '../utils/translations';
import { AuthService } from '../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onAuthSuccess: (user: UserProfile) => void;
  onStartGuestMode: () => void;
}

type ModalMode = 'login' | 'signup' | 'verify-email' | 'forgot' | 'verify-reset-otp';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onAuthSuccess,
  onStartGuestMode,
}) => {
  const [authMode, setAuthMode] = useState<ModalMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(currentLang);
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>('textiles_tailoring');
  const [location, setLocation] = useState('');

  // OTP & Reset States
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(300); // 5 minutes (300s)

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Timer tick for resend cooldown and OTP expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((authMode === 'verify-email' || authMode === 'verify-reset-otp') && expiryCountdown > 0) {
      timer = setTimeout(() => setExpiryCountdown((c) => Math.max(0, c - 1)), 1000);
    }
    return () => clearTimeout(timer);
  }, [authMode, expiryCountdown]);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSwitchMode = (mode: ModalMode) => {
    handleResetForm();
    setAuthMode(mode);
    setOtp('');
    if (mode === 'verify-email' || mode === 'verify-reset-otp') {
      setExpiryCountdown(300);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Submit Registration or Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleResetForm();
    setLoading(true);

    // SIGNUP
    if (authMode === 'signup') {
      if (!name.trim()) {
        setErrorMessage(currentLang === 'hi' ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your full name.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setErrorMessage(
          currentLang === 'hi'
            ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
            : 'Password must be at least 6 characters long.'
        );
        setLoading(false);
        return;
      }

      const res = await AuthService.signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        businessCategory,
        location: location.trim(),
        language: preferredLanguage,
      });

      setLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.requireVerification) {
        setSuccessMessage(
          currentLang === 'hi'
            ? `खाता बन गया! ${res.email} पर 6-अंकीय सत्यापन कोड भेजा गया है।`
            : `Account created! A 6-digit verification code was sent to ${res.email}.`
        );
        setResendCooldown(60);
        setExpiryCountdown(300);
        setAuthMode('verify-email');
      } else if (res.userProfile) {
        setSuccessMessage(
          currentLang === 'hi'
            ? 'खाता सफलतापूर्वक बन गया! आपका स्वागत है।'
            : 'Account created successfully! Welcome to SakhiBiz.'
        );
        setTimeout(() => {
          onAuthSuccess(res.userProfile!);
          onClose();
        }, 1000);
      }
      return;
    }

    // LOGIN
    if (authMode === 'login') {
      const res = await AuthService.signIn(email.trim(), password);
      setLoading(false);

      if (res.requireVerification) {
        setErrorMessage(
          currentLang === 'hi'
            ? 'आपका ईमेल सत्यापित नहीं है। कृपया ईमेल में प्राप्त 6-अंकीय कोड दर्ज करें।'
            : 'Your email address is not verified yet. Please enter the 6-digit verification code.'
        );
        setAuthMode('verify-email');
        setExpiryCountdown(300);
      } else if (res.error) {
        setErrorMessage(res.error);
      } else if (res.userProfile) {
        setSuccessMessage(
          currentLang === 'hi' ? 'लॉग इन सफल!' : 'Signed in successfully!'
        );
        setTimeout(() => {
          onAuthSuccess(res.userProfile!);
          onClose();
        }, 800);
      }
      return;
    }

    // FORGOT PASSWORD REQUEST
    if (authMode === 'forgot') {
      const res = await AuthService.requestPasswordReset(email.trim());
      setLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(
          currentLang === 'hi'
            ? `यदि यह ईमेल पंजीकृत है, तो ${email.trim()} पर 6-अंकीय रीसेट कोड भेजा गया है।`
            : `If this email is registered, a 6-digit reset code has been sent to ${email.trim()}.`
        );
        setResendCooldown(60);
        setExpiryCountdown(300);
        setAuthMode('verify-reset-otp');
      }
      return;
    }
  };

  // 2. Submit Email OTP Verification
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    handleResetForm();

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage(currentLang === 'hi' ? 'कृपया 6-अंकीय OTP कोड दर्ज करें।' : 'Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    const res = await AuthService.verifyEmail(email.trim(), otp.trim());
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.success && res.userProfile) {
      setSuccessMessage(
        currentLang === 'hi'
          ? 'ईमेल सफलतापूर्वक सत्यापित हुआ! आपका स्वागत है।'
          : 'Email verified successfully! Welcome to SakhiBiz.'
      );
      setTimeout(() => {
        onAuthSuccess(res.userProfile!);
        onClose();
      }, 1000);
    }
  };

  // 3. Submit Password Reset (OTP + New Password)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    handleResetForm();

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage(currentLang === 'hi' ? 'कृपया 6-अंकीय OTP कोड दर्ज करें।' : 'Please enter the 6-digit OTP code.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(
        currentLang === 'hi'
          ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'New password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        currentLang === 'hi'
          ? 'दोनों पासवर्ड मेल नहीं खाते।'
          : 'The entered passwords do not match.'
      );
      return;
    }

    setLoading(true);
    const res = await AuthService.resetPassword(email.trim(), otp.trim(), newPassword);
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.success) {
      setSuccessMessage(
        currentLang === 'hi'
          ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है! कृपया नए पासवर्ड से लॉग इन करें।'
          : 'Password reset successfully! Please sign in with your new password.'
      );
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setTimeout(() => {
        setAuthMode('login');
      }, 1500);
    }
  };

  // 4. Resend OTP handler
  const handleResend = async (purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD') => {
    if (resendCooldown > 0) return;
    handleResetForm();
    setLoading(true);

    const res = await AuthService.resendOtp(email.trim(), purpose);
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setSuccessMessage(
        currentLang === 'hi'
          ? 'नया 6-अंकीय कोड आपके ईमेल पर भेज दिया गया है।'
          : 'A new 6-digit verification code has been sent to your email.'
      );
      setResendCooldown(res.secondsRemaining || 60);
      setExpiryCountdown(300);
    }
  };

  const handleGuest = () => {
    onStartGuestMode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white mx-auto flex items-center justify-center mb-3 shadow-md border border-gray-100 p-1.5 overflow-hidden">
            <img
              src="/logo.png"
              alt="SakhiBiz Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#18392B]">
            {authMode === 'login'
              ? getText('loginTitle', currentLang)
              : authMode === 'signup'
              ? currentLang === 'hi'
                ? 'नया खाता बनाएं'
                : 'Create Free Account'
              : authMode === 'verify-email'
              ? currentLang === 'hi'
                ? 'ईमेल सत्यापन (OTP)'
                : 'Verify Email (OTP)'
              : authMode === 'forgot'
              ? currentLang === 'hi'
                ? 'पासवर्ड रीसेट'
                : 'Forgot Password'
              : currentLang === 'hi'
              ? 'नया पासवर्ड सेट करें'
              : 'Set New Password'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {authMode === 'login'
              ? getText('loginSubtitle', currentLang)
              : authMode === 'signup'
              ? currentLang === 'hi'
                ? 'अपने व्यवसाय के लिए 100% मुफ़्त शिक्षा शुरू करें'
                : 'Start free grassroots entrepreneurship learning'
              : authMode === 'verify-email'
              ? currentLang === 'hi'
                ? `सत्यापन कोड ${email || 'आपके ईमेल'} पर भेजा गया है`
                : `Verification code sent to ${email || 'your email'}`
              : authMode === 'forgot'
              ? currentLang === 'hi'
                ? 'अपना पंजीकृत ईमेल दर्ज करें'
                : 'Enter your registered email address'
              : currentLang === 'hi'
              ? 'प्राप्त OTP और नया पासवर्ड दर्ज करें'
              : 'Enter received OTP and choose a new password'}
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="bg-rose-50 text-rose-800 border border-rose-200 p-3 rounded-xl text-xs mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* VIEW 1: EMAIL OTP VERIFICATION SCREEN                       */}
        {/* ----------------------------------------------------------- */}
        {authMode === 'verify-email' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4 text-xs">
            <div className="bg-[#F8F9FA] p-3 rounded-xl border border-gray-200 text-center">
              <span className="text-[11px] text-gray-500 block mb-1">
                {currentLang === 'hi' ? 'सत्यापन कोड गंतव्य:' : 'Code dispatched to:'}
              </span>
              <strong className="text-xs text-[#18392B] font-mono">{email}</strong>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700">
                  {currentLang === 'hi' ? '6-अंकीय सत्यापन कोड (OTP) *' : '6-Digit Verification Code (OTP) *'}
                </label>
                <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#E07A5F]" />
                  <span>{formatSeconds(expiryCountdown)}</span>
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B] font-mono text-center text-lg tracking-widest font-bold"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {currentLang === 'hi'
                  ? 'यह कोड 5 मिनट के लिए वैध है। कृपया स्पैम (Spam) फोल्डर भी जांचें।'
                  : 'This code is valid for 5 minutes. Check your spam/junk folder if not found.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-[#18392B] hover:bg-[#244f3d] disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{currentLang === 'hi' ? 'ईमेल सत्यापित करें' : 'Verify Email'}</span>
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleResend('VERIFY_EMAIL')}
                disabled={loading || resendCooldown > 0}
                className="text-[11px] text-[#E07A5F] hover:underline disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                <span>
                  {resendCooldown > 0
                    ? currentLang === 'hi'
                      ? `पुनः भेजें (${resendCooldown}s)`
                      : `Resend Code (${resendCooldown}s)`
                    : currentLang === 'hi'
                    ? 'कोड दोबारा भेजें'
                    : 'Resend Code'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-[11px] text-gray-600 hover:text-[#18392B] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{currentLang === 'hi' ? 'लॉग इन पर वापस' : 'Back to Sign In'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------------------------------------------------- */}
        {/* VIEW 2: FORGOT PASSWORD REQUEST SCREEN                      */}
        {/* ----------------------------------------------------------- */}
        {authMode === 'forgot' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {getText('emailLabel', currentLang)} *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sunita@example.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {currentLang === 'hi'
                  ? 'हम आपके ईमेल पर 6-अंकीय पासवर्ड रीसेट कोड भेजेंगे।'
                  : 'We will send a 6-digit password reset code to your email.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#18392B] hover:bg-[#244f3d] disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{currentLang === 'hi' ? 'रीसेट कोड भेजें' : 'Send Reset Code'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-[11px] text-gray-600 hover:text-[#18392B] inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{currentLang === 'hi' ? 'लॉग इन पर वापस' : 'Back to Sign In'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------------------------------------------------- */}
        {/* VIEW 3: VERIFY RESET OTP + SET NEW PASSWORD                 */}
        {/* ----------------------------------------------------------- */}
        {authMode === 'verify-reset-otp' && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div className="bg-[#F8F9FA] p-3 rounded-xl border border-gray-200 text-center">
              <span className="text-[11px] text-gray-500 block mb-1">
                {currentLang === 'hi' ? 'रीसेट अनुरोध खाता:' : 'Reset account:'}
              </span>
              <strong className="text-xs text-[#18392B] font-mono">{email}</strong>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700">
                  {currentLang === 'hi' ? '6-अंकीय OTP कोड *' : '6-Digit OTP Code *'}
                </label>
                <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#E07A5F]" />
                  <span>{formatSeconds(expiryCountdown)}</span>
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B] font-mono text-center text-lg tracking-widest font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {currentLang === 'hi' ? 'नया पासवर्ड *' : 'New Password *'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {currentLang === 'hi' ? 'पासवर्ड की पुष्टि करें *' : 'Confirm Password *'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || newPassword.length < 6}
              className="w-full py-3 bg-[#18392B] hover:bg-[#244f3d] disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{currentLang === 'hi' ? 'पासवर्ड सुरक्षित करें' : 'Update Password'}</span>
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleResend('RESET_PASSWORD')}
                disabled={loading || resendCooldown > 0}
                className="text-[11px] text-[#E07A5F] hover:underline disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                <span>
                  {resendCooldown > 0
                    ? currentLang === 'hi'
                      ? `पुनः भेजें (${resendCooldown}s)`
                      : `Resend Code (${resendCooldown}s)`
                    : currentLang === 'hi'
                    ? 'कोड दोबारा भेजें'
                    : 'Resend Code'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-[11px] text-gray-600 hover:text-[#18392B] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{currentLang === 'hi' ? 'रद्द करें' : 'Cancel'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------------------------------------------------- */}
        {/* VIEW 4 & 5: LOGIN / SIGNUP FORMS                           */}
        {/* ----------------------------------------------------------- */}
        {(authMode === 'login' || authMode === 'signup') && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('nameLabel', currentLang)} *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={currentLang === 'hi' ? 'सुनीता देवी' : 'Sunita Devi'}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('bizCategoryLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <select
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value as BusinessCategory)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B] bg-white"
                    >
                      <option value="textiles_tailoring">सिलाई एवं वस्त्र (Textiles & Tailoring)</option>
                      <option value="food_processing_snacks">घरेलू खाद्य पदार्थ एवं आचार (Food & Snacks)</option>
                      <option value="handicrafts_art">हस्तशिल्प व कला (Handicrafts)</option>
                      <option value="beauty_wellness">ब्यूटी पार्लर (Beauty Parlor)</option>
                      <option value="grocery_retail">किराना दुकान (Kirana Retail)</option>
                      <option value="dairy_agriculture">डेयरी व कृषि (Dairy & Farming)</option>
                      <option value="other">अन्य व्यवसाय (Other)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('locationLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={currentLang === 'hi' ? 'जयपुर, राजस्थान' : 'Jaipur, Rajasthan'}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('preferredLangLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B] bg-white"
                    >
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.nativeName} ({l.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {getText('emailLabel', currentLang)} *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sunita@example.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700">
                  {getText('passwordLabel', currentLang)} *
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot')}
                    className="text-[11px] text-[#E07A5F] hover:underline cursor-pointer"
                  >
                    {currentLang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#18392B] hover:bg-[#244f3d] disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>
                {authMode === 'login'
                  ? getText('navSignIn', currentLang)
                  : getText('navSignUp', currentLang)}
              </span>
            </button>
          </form>
        )}

        {/* Guest Mode alternative */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="bg-[#F8F9FA] p-3.5 rounded-2xl border border-gray-200 text-center space-y-2">
            <span className="text-[11px] font-bold text-gray-700 flex items-center justify-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#E07A5F]" />
              <span>{currentLang === 'hi' ? 'अतिथि मोड (अकाउंट के बिना देखें)' : 'Guest Mode (No Account Required)'}</span>
            </span>
            <button
              onClick={handleGuest}
              className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-300 text-[#18392B] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{currentLang === 'hi' ? 'अतिथि के रूप में जारी रखें' : 'Continue as Guest'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-[10px] text-gray-500">
              {currentLang === 'hi'
                ? 'अतिथि डेटा केवल इस डिवाइस के ब्राउज़र में रहता है, क्लाउड पर सुरक्षित नहीं होता।'
                : 'Guest data is saved locally on this device only and is not synced across devices.'}
            </p>
          </div>
        </div>

        {/* Mode Toggle Footer */}
        <div className="mt-4 text-center text-xs text-gray-600">
          {authMode === 'login' ? (
            <p>
              {currentLang === 'hi' ? 'नया खाता चाहिए?' : "Don't have an account?"}{' '}
              <button
                onClick={() => handleSwitchMode('signup')}
                className="font-bold text-[#18392B] hover:underline cursor-pointer"
              >
                {currentLang === 'hi' ? 'मुफ़्त पंजीकरण करें' : 'Sign Up Free'}
              </button>
            </p>
          ) : authMode === 'signup' ? (
            <p>
              {currentLang === 'hi' ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
              <button
                onClick={() => handleSwitchMode('login')}
                className="font-bold text-[#18392B] hover:underline cursor-pointer"
              >
                {getText('navSignIn', currentLang)}
              </button>
            </p>
          ) : (
            <button
              onClick={() => handleSwitchMode('login')}
              className="font-bold text-[#18392B] hover:underline cursor-pointer"
            >
              {currentLang === 'hi' ? 'लॉग इन पर वापस जाएं' : 'Return to Login'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
