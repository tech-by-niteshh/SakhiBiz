import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  bn: { translation: bn },
  ta: { translation: ta },
  te: { translation: te },
  gu: { translation: gu },
  kn: { translation: kn },
} as const;

export const DEFAULT_LANGUAGE = 'hi';

function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem('sakhibiz_language');
    if (stored && ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'].includes(stored)) {
      return stored;
    }
  } catch {
    // LocalStorage unavailable
  }
  return DEFAULT_LANGUAGE;
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
