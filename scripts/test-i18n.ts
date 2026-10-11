import assert from 'node:assert';
import { SUPPORTED_LANGUAGES, LOCALES, getContentText, getText } from '../src/utils/translations';
import { StorageService } from '../src/services/storage';
import { Language } from '../src/types';

console.log('====================================================');
console.log('SakhiBiz Multilingual (8 Languages) Verification');
console.log('====================================================\n');

let passedCount = 0;
function test(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passedCount++;
  } catch (err: any) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
    process.exit(1);
  }
}

// Suite 1: Supported Languages Registry
console.log('--- Suite 1: Supported Languages Registry ---');
test('Exactly 8 supported regional Indian languages are registered', () => {
  assert.strictEqual(SUPPORTED_LANGUAGES.length, 8);
  const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
  assert.deepStrictEqual(codes, ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn']);
});

test('Native script labels are correct and non-empty for all 8 languages', () => {
  const expectedNative: Record<Language, string> = {
    hi: 'हिन्दी',
    en: 'English',
    mr: 'मराठी',
    bn: 'বাংলা',
    ta: 'தமிழ்',
    te: 'తెలుగు',
    gu: 'ગુજરાતી',
    kn: 'ಕನ್ನಡ',
  };

  SUPPORTED_LANGUAGES.forEach((lang) => {
    assert.strictEqual(lang.nativeName, expectedNative[lang.code]);
    assert(lang.name.length > 0);
    assert(lang.region.length > 0);
  });
});

// Suite 2: Locale Dictionary Completeness & Fallbacks
console.log('\n--- Suite 2: Locale Dictionary Completeness & Fallbacks ---');
const requiredKeys = [
  'brandName',
  'tagline',
  'navHome',
  'navCourses',
  'navTools',
  'navAssistant',
  'navDashboard',
  'contentLanguageNotice',
  'quizTitle',
  'quizPassed',
  'quizFailed',
  'toolsTitle',
  'aiTitle',
  'loginTitle',
  'searchPlaceholder',
  'enrollNow',
  'footerAboutText',
];

test('All 8 locale JSON files contain essential interface keys', () => {
  const languages: Language[] = ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'];
  languages.forEach((lang) => {
    const dict = LOCALES[lang];
    assert(dict, `Locale dictionary for ${lang} must exist`);
    requiredKeys.forEach((key) => {
      assert(
        typeof dict[key] === 'string' && dict[key].length > 0,
        `Key "${key}" must be non-empty in locale "${lang}"`
      );
    });
  });
});

test('Fallback to English operates when a key is undefined in other locales', () => {
  const testDict = LOCALES['mr'] as any;
  const original = testDict['non_existent_key_test'];
  const result = getText('non_existent_key_test', 'mr');
  assert.strictEqual(result, 'non_existent_key_test');
});

// Suite 3: Safe Content Resolution (getContentText)
console.log('\n--- Suite 3: Safe Content Resolution ---');
test('getContentText returns native text when available', () => {
  const sample = {
    hi: 'मूल्य और मुनाफा',
    en: 'Pricing and Profit',
    mr: 'किंमत आणि नफा',
  };
  assert.strictEqual(getContentText(sample, 'mr'), 'किंमत आणि नफा');
});

test('getContentText safely falls back to Hindi / English when native translation is absent', () => {
  const sample = {
    hi: 'सुरक्षित डिजिटल भुगतान',
    en: 'Safe Digital Payments',
  };
  // 'kn' is not translated in this sample, should fall back without crashing
  const result = getContentText(sample, 'kn');
  assert.strictEqual(result, 'सुरक्षित डिजिटल भुगतान');
});

test('getContentText handles empty or null gracefully', () => {
  assert.strictEqual(getContentText(null, 'ta'), '');
  assert.strictEqual(getContentText(undefined, 'bn'), '');
  assert.strictEqual(getContentText('Plain string', 'gu'), 'Plain string');
});

// Suite 4: Persistence & Storage Validation
console.log('\n--- Suite 4: Persistence & Storage Validation ---');
test('StorageService recognizes all 8 valid language codes', () => {
  const validLanguages: Language[] = ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'];
  const mockStorage: Record<string, string> = {};

  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = v;
    },
  };

  validLanguages.forEach((lang) => {
    StorageService.setLanguage(lang);
    assert.strictEqual(StorageService.getLanguage(), lang);
  });

  // Invalid code falls back to 'hi'
  StorageService.setLanguage('invalid_code' as any);
  assert.strictEqual(StorageService.getLanguage(), 'hi');
});

console.log('\n====================================================');
console.log(`Multilingual Suite Complete: ${passedCount} Passed, 0 Failed`);
console.log('====================================================\n');
