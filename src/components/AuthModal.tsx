import React, { useState } from 'react';
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

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onAuthSuccess,
  onStartGuestMode,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(currentLang);
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>('textiles_tailoring');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSwitchMode = (mode: 'login' | 'signup' | 'forgot') => {
    handleResetForm();
    setAuthMode(mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleResetForm();
    setLoading(true);

    if (authMode === 'forgot') {
      setSuccessMessage(
        currentLang === 'hi'
          ? 'पासवर्ड रीसेट के लिए कृपया व्यवस्थापक (Admin) से संपर्क करें अथवा नया खाता पंजीकृत करें।'
          : 'For password recovery, please contact the platform administrator or register an active account.'
      );
      setLoading(false);
      return;
    }

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

      const { userProfile, error } = await AuthService.signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        businessCategory,
        location: location.trim(),
        language: preferredLanguage,
      });

      setLoading(false);

      if (error) {
        setErrorMessage(error);
      } else if (userProfile) {
        setSuccessMessage(
          currentLang === 'hi'
            ? 'खाता सफलतापूर्वक बन गया! आपका स्वागत है।'
            : 'Account created successfully! Welcome to SakhiBiz.'
        );
        setTimeout(() => {
          onAuthSuccess(userProfile);
          onClose();
        }, 1000);
      }
      return;
    }

    // Login mode
    if (authMode === 'login') {
      const { userProfile, error } = await AuthService.signIn(email.trim(), password);
      setLoading(false);

      if (error) {
        setErrorMessage(error);
      } else if (userProfile) {
        setSuccessMessage(
          currentLang === 'hi' ? 'लॉग इन सफल!' : 'Signed in successfully!'
        );
        setTimeout(() => {
          onAuthSuccess(userProfile);
          onClose();
        }, 800);
      }
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
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#18392B] text-white mx-auto flex items-center justify-center font-serif text-2xl font-bold mb-3 shadow-md">
            स
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#18392B]">
            {authMode === 'login'
              ? getText('loginTitle', currentLang)
              : authMode === 'signup'
              ? currentLang === 'hi'
                ? 'नया खाता बनाएं'
                : 'Create Free Account'
              : currentLang === 'hi'
              ? 'पासवर्ड रीसेट'
              : 'Password Recovery'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {authMode === 'login'
              ? getText('loginSubtitle', currentLang)
              : authMode === 'signup'
              ? currentLang === 'hi'
                ? 'अपने व्यवसाय के लिए 100% मुफ़्त शिक्षा शुरू करें'
                : 'Start free grassroots entrepreneurship learning'
              : currentLang === 'hi'
              ? 'खाता सहायता एवं पासवर्ड दिशानिर्देश'
              : 'Account support and recovery guidance'}
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

        {/* Form */}
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

          {authMode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700">
                  {getText('passwordLabel', currentLang)} *
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot')}
                    className="text-[11px] text-[#E07A5F] hover:underline"
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
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#18392B] hover:bg-[#244f3d] disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            <span>
              {authMode === 'login'
                ? getText('navSignIn', currentLang)
                : authMode === 'signup'
                ? getText('navSignUp', currentLang)
                : currentLang === 'hi'
                ? 'रीसेट सहायता देखें'
                : 'View Recovery Help'}
            </span>
          </button>
        </form>

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
                className="font-bold text-[#18392B] hover:underline"
              >
                {currentLang === 'hi' ? 'मुफ़्त पंजीकरण करें' : 'Sign Up Free'}
              </button>
            </p>
          ) : (
            <p>
              {currentLang === 'hi' ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
              <button
                onClick={() => handleSwitchMode('login')}
                className="font-bold text-[#18392B] hover:underline"
              >
                {getText('navSignIn', currentLang)}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
