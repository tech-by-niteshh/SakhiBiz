import React, { useState } from 'react';
import { X, User, CheckCircle2, Save, Loader2, AlertCircle } from 'lucide-react';
import { UserProfile, Language, BusinessCategory } from '../types';
import { getText, SUPPORTED_LANGUAGES } from '../utils/translations';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  currentLang: Language;
  onUpdateUser: (updated: UserProfile) => Promise<void> | void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentLang,
  onUpdateUser,
}) => {
  const [name, setName] = useState(user.name);
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>(user.businessCategory);
  const [businessStage, setBusinessStage] = useState(user.businessStage);
  const [location, setLocation] = useState(user.location);
  const [prefLang, setPrefLang] = useState(user.preferredLanguage);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isGuest = user.id.startsWith('guest-');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const updated: UserProfile = {
      ...user,
      name: name.trim() || user.name,
      businessCategory,
      businessStage,
      location: location.trim() || user.location,
      preferredLanguage: prefLang,
    };

    try {
      await onUpdateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#18392B] text-white flex items-center justify-center font-bold">
            <User className="w-5 h-5 text-[#FFD5C8]" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#18392B]">
              {currentLang === 'hi' ? 'प्रोफ़ाइल एवं प्राथमिकताएं' : 'Learner Profile & Settings'}
            </h2>
            <p className="text-xs text-gray-500">
              {isGuest
                ? currentLang === 'hi'
                  ? 'अतिथि खाता (लोकल डिवाइस)'
                  : 'Guest Profile (Local Device)'
                : currentLang === 'hi'
                ? 'सत्यापित खाता (क्लाउड सिंक)'
                : 'Verified Account (Cloud Synced)'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 text-rose-800 border border-rose-200 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {savedSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-base text-[#18392B]">
              {currentLang === 'hi' ? 'प्रोफ़ाइल सुरक्षित हो गई!' : 'Profile updated successfully!'}
            </h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {getText('nameLabel', currentLang)} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {getText('bizCategoryLabel', currentLang)}
              </label>
              <select
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value as BusinessCategory)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B] bg-white"
              >
                <option value="textiles_tailoring">सिलाई एवं वस्त्र (Textiles & Garments)</option>
                <option value="food_processing_snacks">घरेलू खाद्य पदार्थ एवं आचार (Food & Snacks)</option>
                <option value="handicrafts_art">हस्तशिल्प व कला (Handicrafts)</option>
                <option value="beauty_wellness">ब्यूटी पार्लर (Beauty Parlor)</option>
                <option value="grocery_retail">किराना दुकान (Kirana Retail)</option>
                <option value="dairy_agriculture">डेयरी व कृषि (Dairy)</option>
                <option value="other">अन्य व्यवसाय (Other)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {currentLang === 'hi' ? 'व्यवसाय की वर्तमान स्थिति' : 'Business Stage'}
              </label>
              <select
                value={businessStage}
                onChange={(e) => setBusinessStage(e.target.value as any)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B] bg-white"
              >
                <option value="idea">
                  {currentLang === 'hi' ? 'अभी विचार कर रही हूँ (Planning / Idea)' : 'Planning Stage'}
                </option>
                <option value="starting">
                  {currentLang === 'hi' ? 'हाल ही में शुरू किया (Starting Out)' : 'Early Stage'}
                </option>
                <option value="growing">
                  {currentLang === 'hi' ? 'चल रहा है, और बढ़ाना है (Growing)' : 'Growing Venture'}
                </option>
                <option value="established">
                  {currentLang === 'hi' ? 'स्थापित दुकान या व्यवसाय (Established)' : 'Established'}
                </option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {getText('locationLabel', currentLang)}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none focus:border-[#18392B]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                {getText('preferredLangLabel', currentLang)}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setPrefLang(lang.code)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                      prefLang === lang.code
                        ? 'bg-[#18392B] text-white border-[#18392B] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{lang.nativeName}</span>
                    <span
                      className={`text-[10px] uppercase ml-1 shrink-0 ${
                        prefLang === lang.code ? 'text-[#FFD5C8]' : 'text-gray-400'
                      }`}
                    >
                      {lang.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#18392B] hover:bg-[#244f3d] disabled:opacity-60 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 mt-4"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Save className="w-4 h-4 text-[#FFD5C8]" />
              )}
              <span>{getText('saveProfileBtn', currentLang)}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
