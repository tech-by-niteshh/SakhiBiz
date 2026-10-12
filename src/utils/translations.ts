import { Language } from '../types';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';
import bn from '../locales/bn.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import gu from '../locales/gu.json';
import kn from '../locales/kn.json';

export interface SupportedLanguage {
  code: Language;
  name: string;        // English name
  nativeName: string;  // Native script
  region: string;      // Geographic identity
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North / Central India' },
  { code: 'en', name: 'English', nativeName: 'English', region: 'Pan-India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal & East' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra & Telangana' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
];

export const LOCALES: Record<Language, Record<string, string>> = {
  en,
  hi,
  mr,
  bn,
  ta,
  te,
  gu,
  kn,
};

export const t = {
  // Navigation & Brand
  brandName: {
    hi: 'सखीबिज',
    en: 'SakhiBiz',
  },
  tagline: {
    hi: 'हुनर सीखें। व्यापार बढ़ाएं। आत्मनिर्भर बनें।',
    en: 'Learn Skills. Grow Business. Build Independence.',
  },
  subtagline: {
    hi: 'आपकी अपनी भाषा में व्यावहारिक व्यावसायिक शिक्षा, आपकी सफलता के लिए तैयार।',
    en: 'Practical business education in your language, designed for your journey.',
  },
  navHome: { hi: 'मुख्य पृष्ठ', en: 'Home' },
  navCourses: { hi: 'कोर्स देखें', en: 'Explore Courses' },
  navTools: { hi: 'बिजनेस टूल्स', en: 'Business Toolkit' },
  navAssistant: { hi: 'सखी AI साथी', en: 'Sakhi AI Mentor' },
  navDashboard: { hi: 'मेरी पढ़ाई', en: 'Learner Dashboard' },
  navAbout: { hi: 'हमारे बारे में', en: 'About Us' },
  navResources: { hi: 'सरकारी योजनाएं', en: 'Govt Schemes' },
  navSignIn: { hi: 'लॉग इन करें', en: 'Log In' },
  navSignUp: { hi: 'शुरू करें (मुफ़्त)', en: 'Get Started' },
  navSignOut: { hi: 'लॉग आउट', en: 'Log Out' },
  demoModeBadge: { hi: 'डेमो मोड सक्रिय', en: 'Demo Mode Active' },
  localPersistence: { hi: 'स्थानीय डेटा सुरक्षित', en: 'Local Data Saved' },

  // Hero Section
  heroTitle: {
    hi: 'आपकी व्यावसायिक सफलता की यात्रा यहीं से शुरू होती है',
    en: 'Your Business Journey Starts Here.',
  },
  heroSubtitle: {
    hi: 'ग्रामीण और अर्ध-शहरी महिला उद्यमियों के लिए विशेष रूप से डिज़ाइन की गई आसान भाषा में डिजिटल शिक्षा। वित्तीय समझ, ऑनलाइन भुगतान सुरक्षा, सोशल मीडिया से बिक्री और बिजनेस टूल्स — सब कुछ एक ही मंच पर।',
    en: 'Designed specifically for rural and semi-urban women entrepreneurs. Master financial literacy, digital payments, WhatsApp marketing, and micro-business management in your preferred language.',
  },
  heroCtaStart: { hi: 'पढ़ाई शुरू करें (मुफ़्त)', en: 'Start Learning' },
  heroCtaCourses: { hi: 'सभी कोर्स देखें', en: 'Explore Courses' },
  heroCtaTools: { hi: 'मुफ़्त कैलकुलेटर चलाएं', en: 'Open Business Toolkit' },
  heroTrustBadges: {
    freeLearning: {
      hi: '100% मुफ़्त शिक्षा',
      en: '100% Free Learning',
      mr: '१००% मोफत शिक्षण',
      bn: '১০০% বিনামূল্যে শিক্ষা',
      ta: '100% இலவச கற்றல்',
      te: '100% ఉచిత విద్య',
      gu: '100% નિઃશુલ્ક શિક્ષણ',
      kn: '100% ಉಚಿತ ಶಿಕ್ಷಣ',
    },
    audioVideoSimple: {
      hi: 'सरल उदाहरण व केस स्टडीज़',
      en: 'Simple Real Scenarios',
      mr: 'सोपी उदाहरणे व अनुभव',
      bn: 'সহজ বাস্তব উদাহরণ',
      ta: 'எளிய நடைமுறை உதாரணங்கள்',
      te: 'సులభమైన వాస్తవ ఉదాహరణలు',
      gu: 'સરળ ઉદાહરણો અને અનુભવો',
      kn: 'ಸರಳ ಪ್ರಾಯೋಗಿಕ ಉದಾಹರಣೆಗಳು',
    },
    regionalLanguages: {
      hi: '8 भारतीय भाषाओं में उपलब्ध',
      en: 'Available in 8 Indian Languages',
      mr: '८ भारतीय भाषांमध्ये उपलब्ध',
      bn: '৮টি ভারতীয় ভাষায় উপলব্ধ',
      ta: '8 இந்திய மொழிகளில் கிடைக்கிறது',
      te: '8 భారతీయ భాషలలో లభ్యం',
      gu: '8 ભારતીય ભાષાઓમાં ઉપલબ્ધ',
      kn: '8 ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ',
    },
    mobileFriendly: {
      hi: 'मोबाइल पर आसानी से सीखें',
      en: 'Fast & Mobile-Friendly',
      mr: 'मोबाईलवर सहज शिक्षण',
      bn: 'মোবাইলে সহজে শিখুন',
      ta: 'மொபைலில் எளிதாக கற்கலாம்',
      te: 'మొబైల్‌లో సులభంగా నేర్చుకోండి',
      gu: 'મોબાઇલ પર સરળતાથી શીખો',
      kn: 'ಮೊಬೈಲ್‌ನಲ್ಲಿ ಸುಲಭ ಕಲಿಕೆ',
    },
  },

  // Categories
  categoriesTitle: { hi: 'सीखने के मुख्य विषय', en: 'Core Learning Tracks' },
  categoriesSubtitle: {
    hi: 'अपने व्यवसाय को नए स्तर पर ले जाने के लिए व्यावहारिक और उपयोगी ज्ञान चुनें',
    en: 'Practical skills to help you build financial confidence and grow sales',
  },
  category_all: { hi: 'सभी श्रेणियां', en: 'All Categories' },
  category_financial_literacy: { hi: 'वित्तीय साक्षरता', en: 'Financial Literacy' },
  category_digital_marketing: { hi: 'डिजिटल मार्केटिंग', en: 'Digital Marketing' },
  category_social_media: { hi: 'सोशल मीडिया से बिक्री', en: 'Social Media for Business' },
  category_digital_payments: { hi: 'सुरक्षित डिजिटल भुगतान', en: 'Digital Payments & Safety' },
  category_business_planning: { hi: 'व्यवसाय योजना', en: 'Business Planning' },
  category_customer_management: { hi: 'ग्राहक संबंध', en: 'Customer Management' },
  category_pricing_profit: { hi: 'लागत और सही मुनाफा', en: 'Pricing and Profit' },
  category_ecommerce_basics: { hi: 'ई-कॉमर्स मूल बातें', en: 'E-commerce Basics' },
  category_government_schemes: { hi: 'सरकारी योजनाएं व लोन', en: 'Govt Schemes & Resources' },
  category_communication: { hi: 'बातचीत और मोलभाव', en: 'Communication & Negotiation' },

  // How it works
  howItWorksTitle: { hi: 'सखीबिज कैसे काम करता है?', en: 'How SakhiBiz Works' },
  howItWorksSubtitle: { hi: 'सीखने से लेकर कमाने तक, सिर्फ 4 सरल कदम', en: 'From learning to earning in 4 simple steps' },
  step1Title: { hi: '1. अपनी भाषा चुनें', en: '1. Choose Your Language' },
  step1Desc: { hi: 'हिन्दी या अंग्रेजी में से अपनी पसंदीदा भाषा चुनें और सरल उदाहरणों से सीखना शुरू करें।', en: 'Select Hindi or English for clear, easy-to-understand explanations.' },
  step2Title: { hi: '2. वास्तविक उदाहरणों से सीखें', en: '2. Learn from Real Scenarios' },
  step2Desc: { hi: 'सिलाई, आचार-पापड़, ब्यूटी पार्लर और किराना जैसे घरेलू व्यवसायों की सच्ची कहानियों से समझें।', en: 'Relatable lessons based on real tailoring, food, craft, and retail businesses.' },
  step3Title: { hi: '3. टूल्स से हिसाब लगाएं', en: '3. Use Practical Tools' },
  step3Desc: { hi: 'प्रॉफिट कैलकुलेटर, खर्च डायरी और बिजनेस प्लानर से अपने व्यापार का सटीक हिसाब रखें।', en: 'Calculate exact profits, track daily expenses, and formulate your business plan.' },
  step4Title: { hi: '4. सखी AI से तुरंत पूछें', en: '4. Ask Sakhi AI Anytime' },
  step4Desc: { hi: 'जब भी कोई शंका हो, हमारे एआई मेंटर से अपनी भाषा में बात करें और तुरंत सरल सलाह पाएं।', en: 'Get instant, empathetic mentorship on pricing, marketing, and safety.' },

  // Impact Section
  impactTitle: { hi: 'सखीबिज का प्रभाव (प्रतीकात्मक डेटा)', en: 'Our Impact (Illustrative Metrics)' },
  impactSubtitle: { hi: 'भारत के हर कोने में महिलाओं के व्यवसाय को गति देना हमारा संकल्प है', en: 'Empowering women entrepreneurs across grassroots India' },
  stat1Number: { hi: '12,500+', en: '12,500+' },
  stat1Label: { hi: 'महिला उद्यमी जुड़ीं (डेमो गणना)', en: 'Women Learners Enrolled (Demo)' },
  stat2Number: { hi: '94%', en: '94%' },
  stat2Label: { hi: 'मुनाफा निकालने में आत्मविश्वास', en: 'Confidence in Calculating Profit' },
  stat3Number: { hi: '100%', en: '100%' },
  stat3Label: { hi: 'मुफ़्त व क्षेत्रीय भाषा में', en: 'Free & Accessible Learning' },
  stat4Number: { hi: '35+', en: '35+' },
  stat4Label: { hi: 'व्यावहारिक पाठ व टूल्स', en: 'Practical Lessons & Calculators' },

  // Testimonials (Sample)
  testimonialsTitle: { hi: 'हमारे शिक्षार्थियों के अनुभव (नमूना कहानियाँ)', en: 'Learner Stories (Sample Profiles)' },
  testimonialsSubtitle: { hi: 'देखिए कैसे छोटे व्यवसायों ने सही हिसाब और ऑनलाइन टूल्स से तरक्की पाई', en: 'Real-world inspiration from grassroots business owners' },
  testimonial1Name: { hi: 'सुनीता देवी', en: 'Sunita Devi' },
  testimonial1Role: { hi: 'हस्तशिल्प व सिलाई, जयपुर', en: 'Handicrafts & Tailoring, Jaipur' },
  testimonial1Quote: {
    hi: '"पहले मैं सूट सिलने में अपनी मेहनत का खर्च नहीं जोड़ती थी, जिससे बचत नहीं दिखती थी। सखीबिज के प्रॉफिट कैलकुलेटर ने मुझे सिखाया कि सही कीमत कैसे तय करें!"',
    en: '"Earlier I never counted my own labor cost when stitching suits, so I never saw savings. SakhiBiz’s Profit Calculator taught me how to price with real margin!"',
  },
  testimonial2Name: { hi: 'फातिमा बीवी', en: 'Fatima Biwi' },
  testimonial2Role: { hi: 'घरेलू आचार व मसाले, लखनऊ', en: 'Homemade Pickles & Spices, Lucknow' },
  testimonial2Quote: {
    hi: '"व्हाट्सएप बिजनेस पर कैटलॉग बनाना सीखने के बाद मेरे ऑर्डर्स सीधे दोगुने हो गए। सुरक्षित QR कोड से पेमेंट लेना भी बहुत आसान हो गया है।"',
    en: '"After learning how to set up a WhatsApp Business catalog, my weekly orders doubled. Receiving payments securely via QR code gave me peace of mind."',
  },

  // FAQ
  faqTitle: { hi: 'अक्सर पूछे जाने वाले सवाल (FAQ)', en: 'Frequently Asked Questions' },
  faq1Q: { hi: 'क्या सखीबिज का उपयोग करने के लिए कोई फीस देनी होगी?', en: 'Is SakhiBiz completely free to use?' },
  faq1A: { hi: 'हाँ, सखीबिज सभी महिला उद्यमियों के लिए 100% मुफ़्त है। सभी कोर्स, टूल्स और एआई मेंटर बिना किसी शुल्क के उपलब्ध हैं।', en: 'Yes, SakhiBiz is 100% free for all women entrepreneurs. All lessons, business tools, and AI mentorship are accessible at zero cost.' },
  faq2Q: { hi: 'क्या मैं इसे अपने साधारण मोबाइल फोन पर चला सकती हूँ?', en: 'Can I use this on a simple mobile phone?' },
  faq2A: { hi: 'बिल्कुल! सखीबिज को कम इंटरनेट स्पीड और सामान्य स्मार्टफोन पर बहुत तेज और आसानी से चलने के लिए बनाया गया है।', en: 'Absolutely! SakhiBiz is optimized for low-bandwidth mobile devices with responsive layouts and lightweight pages.' },
  faq3Q: { hi: 'क्या मेरा हिसाब-किताब और खर्च सुरक्षित रहेगा?', en: 'Is my expense and profit calculation data secure?' },
  faq3A: { hi: 'हाँ, आपका सारा डेटा आपके ब्राउज़र और सुरक्षित स्टोरेज में संरक्षित रहता है। हम कभी भी आपकी निजी वित्तीय जानकारी साझा नहीं करते।', en: 'Yes, your data is securely stored in your local session and account. We never sell or share your micro-business figures.' },
  faq4Q: { hi: 'क्या सखीबिज सरकारी लोन या प्रमाण पत्र सीधे जारी करता है?', en: 'Does SakhiBiz directly issue government loans or certificates?' },
  faq4A: { hi: 'सखीबिज एक शैक्षिक मंच है। हम आपको मुद्रा लोन, उद्यम रजिस्ट्रेशन और अन्य योजनाओं के सही नियम और आधिकारिक वेबसाइटें सिखाते हैं ताकि आप किसी दलाल के झांसे में न आएं।', en: 'SakhiBiz is an educational platform. We provide factual guides on how to access Mudra loans and Udyam MSME registration directly via official portals.' },

  // Course & Learning
  searchPlaceholder: { hi: 'कोर्स खोजें (जैसे: मुनाफा, व्हाट्सएप, सुरक्षा, लोन)...', en: 'Search courses (e.g., profit, WhatsApp, safety, loan)...' },
  filterByLevel: { hi: 'स्तर', en: 'Level' },
  filterByLanguage: { hi: 'भाषा', en: 'Language' },
  allLevels: { hi: 'सभी स्तर', en: 'All Levels' },
  beginner: { hi: 'शुरुआती (Beginner)', en: 'Beginner' },
  intermediate: { hi: 'मध्यम (Intermediate)', en: 'Intermediate' },
  lessonsCount: { hi: 'पाठ', en: 'Lessons' },
  hoursCount: { hi: 'घंटे', en: 'Hours' },
  enrollNow: { hi: 'पढ़ाई शुरू करें', en: 'Enroll Now' },
  continueLearning: { hi: 'पढ़ाई जारी रखें', en: 'Continue Learning' },
  courseCompleted: { hi: 'कोर्स पूरा हुआ! 🎉', en: 'Course Completed! 🎉' },
  lessonCompleted: { hi: 'पूरा हुआ माना गया', en: 'Completed' },
  markComplete: { hi: 'यह पाठ पूरा हुआ (Mark as Done)', en: 'Mark as Complete' },
  prevLesson: { hi: 'पिछला पाठ', en: 'Previous Lesson' },
  nextLesson: { hi: 'अगला पाठ', en: 'Next Lesson' },
  takeQuiz: { hi: 'अंतिम टेस्ट दें (Take Quiz)', en: 'Take Course Quiz' },
  retakeQuiz: { hi: 'दोबारा टेस्ट दें', en: 'Retake Quiz' },
  aiSimplifyBtn: { hi: 'सखी AI: आसान भाषा में समझें', en: 'Simplify with Sakhi AI' },
  aiSimplifyHint: { hi: 'इस पाठ के मुख्य बिंदु को सरल घरेलू उदाहरण के साथ समझें', en: 'Get an ultra-simple regional explanation with relatable examples' },
  practicalActivityTitle: { hi: 'करके देखें (Practical Activity)', en: 'Practical Hands-on Activity' },
  keyTakeawaysTitle: { hi: 'आज की मुख्य सीख (Key Takeaways)', en: 'Key Takeaways' },

  // Quiz
  quizTitle: { hi: 'कोर्स मूल्यांकन टेस्ट', en: 'Course Assessment Quiz' },
  quizScore: { hi: 'आपका स्कोर', en: 'Your Score' },
  quizPassed: { hi: 'बधाई हो! आपने यह टेस्ट पास कर लिया है 🏆', en: 'Congratulations! You passed this assessment 🏆' },
  quizFailed: { hi: 'कोई बात नहीं! पाठ दोबारा पढ़ें और फिर से कोशिश करें 💪', en: 'Good effort! Review the lesson and try again 💪' },
  submitAnswers: { hi: 'उत्तर जमा करें', en: 'Submit Answers' },
  explanation: { hi: 'सही उत्तर की व्याख्या', en: 'Explanation' },

  // Business Tools
  toolsTitle: { hi: 'व्यावसायिक उपकरण (Business Toolkit)', en: 'Practical Business Toolkit' },
  toolsSubtitle: { hi: 'सटीक हिसाब-किताब, मूल्य निर्धारण और डिजिटल सुरक्षा के लिए आसान कैलकुलेटर', en: 'Zero-math calculators and safety checklists designed for micro-entrepreneurs' },
  tabProfitCalc: { hi: 'प्रॉफिट कैलकुलेटर', en: 'Profit Calculator' },
  tabExpenseTracker: { hi: 'खर्च डायरी (Expense Tracker)', en: 'Expense Tracker' },
  tabPricingAssistant: { hi: 'मूल्य निर्धारण सहायक', en: 'Pricing Assistant' },
  tabBusinessPlanner: { hi: 'सरल बिजनेस प्लानर', en: 'Business Planner' },
  tabDigitalSafety: { hi: 'डिजिटल सुरक्षा गाइड', en: 'Digital Safety Guide' },
  tabResources: { hi: 'सरकारी योजना निर्देशिका', en: 'Govt Schemes Directory' },

  // Profit Calculator
  productNameLabel: { hi: 'उत्पाद / सेवा का नाम', en: 'Product or Service Name' },
  unitCostLabel: { hi: 'एक पीस बनाने की कुल लागत (₹)', en: 'Cost Per Unit (₹)' },
  sellingPriceLabel: { hi: 'बिक्री मूल्य (Selling Price ₹)', en: 'Selling Price Per Unit (₹)' },
  quantitySoldLabel: { hi: 'बेची गई संख्या (Quantity)', en: 'Units Sold (Qty)' },
  totalCostLabel: { hi: 'कुल लागत (Total Cost)', en: 'Total Cost' },
  totalRevenueLabel: { hi: 'कुल बिक्री राशि (Revenue)', en: 'Total Revenue' },
  netProfitLabel: { hi: 'शुद्ध मुनाफा / हानि (Net Profit/Loss)', en: 'Net Profit / Loss' },
  profitMarginLabel: { hi: 'मुनाफा प्रतिशत (Margin %)', en: 'Profit Margin (%)' },
  resetBtn: { hi: 'रीसेट करें', en: 'Reset' },
  calculateBtn: { hi: 'हिसाब लगाएं', en: 'Calculate' },

  // Expense Tracker
  addExpenseTitle: { hi: 'नया खर्च जोड़ें', en: 'Record New Expense' },
  expenseCategory: { hi: 'खर्च की श्रेणी', en: 'Expense Category' },
  expenseAmount: { hi: 'रकम (₹)', en: 'Amount (₹)' },
  expenseDate: { hi: 'तारीख', en: 'Date' },
  expenseDesc: { hi: 'विवरण / नोट', en: 'Description / Notes' },
  addExpenseBtn: { hi: 'खर्च दर्ज करें', en: 'Add Expense' },
  totalExpensesLabel: { hi: 'कुल खर्च', en: 'Total Expenses' },
  noExpensesYet: { hi: 'अभी कोई खर्च दर्ज नहीं है। ऊपर दिए गए फॉर्म से पहला खर्च जोड़ें।', en: 'No expenses recorded yet. Add your first record above.' },

  // AI Assistant
  aiTitle: { hi: 'सखी - आपकी निजी बिजनेस मेंटर', en: 'Sakhi - Your Personal Business Mentor' },
  aiSubtitle: { hi: 'दुकान, सिलाई, आचार, कीमत या सुरक्षा से जुड़ा कोई भी सवाल बेझिझक पूछें', en: 'Ask any micro-business question in Hindi or English' },
  askPlaceholder: { hi: 'सखी से पूछें (उदा: कुर्ती की कीमत कैसे तय करूं?)...', en: 'Ask Sakhi (e.g. How to set price for handloom saree?)...' },
  sendBtn: { hi: 'भेजें', en: 'Send' },
  aiDisclaimer: {
    hi: '⚠️ सखी एक शैक्षिक मार्गदर्शक है। महत्वपूर्ण वित्तीय या कानूनी निर्णयों के लिए आधिकारिक बैंक या सरकारी पोर्टल से पुष्टि अवश्य करें।',
    en: '⚠️ Sakhi provides educational guidance. For critical financial or legal decisions, please verify with official bank or government portals.',
  },

  // Auth & Profile
  loginTitle: { hi: 'सखीबिज में आपका स्वागत है', en: 'Welcome to SakhiBiz' },
  loginSubtitle: { hi: 'अपनी पढ़ाई और सहेजे गए टूल्स तक पहुँचने के लिए प्रवेश करें', en: 'Sign in to access your dashboard, saved plans, and certificates' },
  emailLabel: { hi: 'ईमेल पता', en: 'Email Address' },
  passwordLabel: { hi: 'पासवर्ड', en: 'Password' },
  nameLabel: { hi: 'आपका पूरा नाम', en: 'Your Full Name' },
  preferredLangLabel: { hi: 'पसंदीदा भाषा', en: 'Preferred Language' },
  bizCategoryLabel: { hi: 'व्यवसाय का प्रकार', en: 'Business Category' },
  locationLabel: { hi: 'शहर / जिला / राज्य', en: 'City / District / State' },
  demoLoginBtn: { hi: '1-क्लिक डेमो प्रोफाइल से जुड़ें (सुनीता देवी)', en: 'Quick Demo Profile (Sunita Devi)' },
  demoGuestBtn: { hi: 'अतिथि (Guest) के रूप में देखें', en: 'Continue as Guest' },
  saveProfileBtn: { hi: 'प्रोफ़ाइल सहेजें', en: 'Save Profile' },
  streakLabel: { hi: 'सीखने का सिलसिला', en: 'Learning Streak' },
  daysLabel: { hi: 'दिन', en: 'days' },

  // Footer & Misc
  footerAboutText: {
    hi: 'सखीबिज भारत की ग्रामीण और अर्ध-शहरी महिला उद्यमियों को सशक्त बनाने वाला समर्पित क्षेत्रीय ई-लर्निंग मंच है। हुनर सीखें, व्यापार बढ़ाएं, आत्मनिर्भर बनें।',
    en: 'SakhiBiz is a regional e-learning platform empowering rural and semi-urban Indian women entrepreneurs with practical business skills and digital confidence.',
  },
  copyrightText: {
    hi: '© 2026 सखीबिज (SakhiBiz). सभी अधिकार सुरक्षित। महिला उद्यमिता संवर्धन पहल।',
    en: '© 2026 SakhiBiz. All rights reserved. Grassroots Women Entrepreneurship Initiative.',
  },
};

export function getContentText(
  record: Record<string, any> | string | undefined | null,
  lang: Language,
  fallbackLang: Language = 'hi'
): any {
  if (!record) return '';
  if (typeof record === 'string') return record;
  return record[lang] || record[fallbackLang] || record['hi'] || record['en'] || '';
}

export function getText(key: keyof typeof t | string, lang: Language): string {
  // 1. Check loaded locale JSON
  const localeVal = LOCALES[lang]?.[key as string];
  if (localeVal) return localeVal;

  // 2. Fallback to English in locale JSON
  const enLocaleVal = LOCALES['en']?.[key as string];
  if (enLocaleVal) return enLocaleVal;

  // 3. Fallback to legacy dictionary t
  const legacyItem = (t as any)[key];
  if (legacyItem) {
    return legacyItem[lang] || legacyItem['en'] || legacyItem['hi'] || '';
  }

  return typeof key === 'string' ? key : '';
}

