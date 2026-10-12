import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => this;
}

const SAKHI_SYSTEM_INSTRUCTION = `
You are "Sakhi" (सखी - Business Mentor & Friend), an empathetic, knowledgeable, and practical business mentor for rural and semi-urban Indian women micro-entrepreneurs on the SakhiBiz platform.
Target audience: Women running or starting small ventures like tailoring shops, homemade papad/pickles, handicraft sarees, small grocery stalls (kirana), beauty parlors, dairy farming, poultry, and home bakeries.

Guidelines:
1. Language: Answer in the language the user speaks. If they write in Hindi (Devanagari or Hinglish), respond in warm, simple Hindi (Devanagari). If in English, respond in clear, easy English.
2. Tone: Warm, encouraging, respectful (use 'आप', 'दीदी' where appropriate), practical, and never intimidating.
3. Keep advice clear, actionable, and grounded in real-world Indian micro-business scenarios (e.g. calculation with rupees ₹, using WhatsApp Business, managing daily khata / cashbook).
4. Emphasize digital financial safety: remind them never to share OTPs or enter their UPI PIN to receive money.
5. Important Disclaimer: If the user asks about loans, government schemes, or taxation, provide helpful general guidance and remind them to verify official details through government portals (such as udyamregistration.gov.in or mudra.org.in) or local bank branches.
`;

const LANGUAGE_META: Record<string, { name: string; script: string; greeting: string }> = {
  hi: { name: 'Hindi', script: 'Devanagari', greeting: 'नमस्ते दीदी!' },
  en: { name: 'English', script: 'English/Latin', greeting: 'Hello!' },
  mr: { name: 'Marathi', script: 'Devanagari (मराठी)', greeting: 'नमस्कार ताई!' },
  bn: { name: 'Bengali', script: 'Bengali script (বাংলা)', greeting: 'নমস্কার দিদি!' },
  ta: { name: 'Tamil', script: 'Tamil script (தமிழ்)', greeting: 'வணக்கம் அக்கா!' },
  te: { name: 'Telugu', script: 'Telugu script (తెలుగు)', greeting: 'నమస్కారం అక్కా!' },
  gu: { name: 'Gujarati', script: 'Gujarati script (ગુજરાતી)', greeting: 'નમસ્તે બહેન!' },
  kn: { name: 'Kannada', script: 'Kannada script (ಕನ್ನಡ)', greeting: 'ನಮಸ್ಕಾರ ಅಕ್ಕ!' },
};

function getRegionalFallback(message: string, language: string): string {
  const query = message.toLowerCase();
  const langMeta = LANGUAGE_META[language] || LANGUAGE_META['hi'];
  
  if (language === 'hi') {
    if (query.includes('मुनाफा') || query.includes('लाभ') || query.includes('profit') || query.includes('कीमत') || query.includes('cost') || query.includes('मूल्य')) {
      return `नमस्ते दीदी! सही मुनाफा निकालने के लिए यह सरल नियम याद रखें:\n\n1. **कुल लागत (Total Cost)** = कच्चा माल + आपकी मेहनत (श्रम) + पैकिंग और आने-जाने का खर्च।\n2. **बिक्री मूल्य (Selling Price)** = कुल लागत + आपका तय मुनाफा (कम से कम 25% से 40%)।\n3. **सावधानी:** कभी भी अपनी खुद की मेहनत (समय) को मुफ़्त न समझें! उसे भी लागत में ज़रूर जोड़ें।\n\nआप हमारे 'Business Tools' में जाकर **Profit Calculator** का भी इस्तेमाल कर सकती हैं!`;
    }
    if (query.includes('upi') || query.includes('otp') || query.includes('धोखा') || query.includes('scam') || query.includes('पिन') || query.includes('सुरक्षा')) {
      return `सुरक्षा का सबसे बड़ा स्वर्णिम नियम (Golden Rule):\n\n⚠️ **पैसे प्राप्त करने के लिए कभी भी UPI PIN डालने की ज़रूरत नहीं होती!** UPI PIN सिर्फ तभी डाला जाता है जब आप किसी को पैसे भेज रही हों।\n\n1. किसी भी अनजान व्यक्ति को अपना OTP, बैंक पासवर्ड या UPI PIN कभी न बताएं।\n2. यदि कोई फोन पर कहे कि "मैंने गलती से पैसे भेज दिए, लिंक पर क्लिक करो", तो तुरंत सावधान हो जाएं और बैंक स्टेटमेंट चेक करें।`;
    }
    if (query.includes('whatsapp') || query.includes('व्हाट्सएप') || query.includes('ग्राहक') || query.includes('मार्केटिंग') || query.includes('प्रचार')) {
      return `व्हाट्सएप से व्यापार बढ़ाने के 3 आसान तरीके:\n\n1. **WhatsApp Business ऐप का इस्तेमाल करें:** इसमें आप अपने सामान (जैसे सूट, आचार, हस्तशिल्प) का सुंदर कैटलॉग (Catalog) बना सकती हैं।\n2. **स्टेटस अपडेट:** रोज़ सुबह 10-11 बजे नए सामान की 2-3 साफ तस्वीरें कीमत और ब्यौरे के साथ लगाएं।\n3. **ग्राहकों की लिस्ट बनाएं:** पुराने ग्राहकों को नए ऑफर्स की सूचना दें और उनकी राय पूछें।`;
    }
    if (query.includes('मुद्रा') || query.includes('लोन') || query.includes('loan') || query.includes('योजना') || query.includes('scheme') || query.includes('सहायता')) {
      return `महिला उद्यमियों के लिए प्रमुख सरकारी योजनाएं:\n\n1. **प्रधानमंत्री मुद्रा योजना (PMMY):**\n   - शिशु लोन: ₹50,000 तक (नया काम शुरू करने के लिए)\n   - किशोर लोन: ₹50,000 से ₹5 लाख तक\n2. **उद्यम रजिस्ट्रेशन (Udyam):** udyamregistration.gov.in पर मुफ्त में रजिस्टर करें, इससे सरकारी योजनाओं में प्राथमिकता मिलती है।\n\nनोट: किसी भी दलाल को पैसे न दें, सीधे अपने नजदीकी बैंक शाखा या कॉमन सर्विस सेंटर (CSC) जाएं।`;
    }
    return `नमस्ते दीदी! आपका सवाल बहुत महत्वपूर्ण है।\n\nएक सफल व्यवसाय के लिए तीन बातें हमेशा ध्यान में रखें:\n1. **दैनिक हिसाब-किताब:** रोज की कमाई और खर्चे को एक डायरी या हमारे Expense Tracker में लिखें।\n2. **ग्राहकों से मीठा व्यवहार:** संतुष्ट ग्राहक ही 4 नए ग्राहकों को लेकर आता है।\n3. **डिजिटल टूल्स का उपयोग:** पेमेंट के लिए सुरक्षित QR कोड और प्रचार के लिए व्हाट्सएप कैटलॉग अपनाएं।\n\nक्या आप किसी खास विषय (जैसे कीमत तय करना, मार्केटिंग या सुरक्षा) के बारे में विस्तार से जानना चाहती हैं?`;
  } else if (language === 'mr') {
    return `${langMeta.greeting} व्यवसाय वाढवण्यासाठी आणि नफा मिळवण्यासाठी या ३ गोष्टी लक्षात ठेवा:\n1. **किंमत ठरवणे:** कच्चा माल + तुमची मेहनत + वाहतूक खर्च जोडून योग्य नफा जोडा.\n2. **सुरक्षित व्यवहार:** पैसे स्वीकारण्यासाठी कधीही UPI PIN टाकू नका.\n3. **कस्टमर संबंध:** ग्राहकांशी नम्र संवाद आणि वेळेवर सेवा.\nतुम्हाला कोणत्या विषयावर अधिक मदत हवी आहे?`;
  } else if (language === 'bn') {
    return `${langMeta.greeting} আপনার ব্যবসার উন্নতির জন্য ৩টি গুরুত্বপূর্ণ নিয়ম:\n১. **সঠিক লাভ:** কাঁচামালের খরচের সঙ্গে আপনার নিজস্ব শ্রম ও প্যাকিং খরচ যোগ করুন।\n২. **নিরাপদ লেনদেন:** টাকা পাওয়ার জন্য কখনো UPI PIN দিতে হয় না।\n৩. **ডিজিটাল প্রচার:** WhatsApp Business-এ পণ্যের ক্যাটালগ তৈরি করুন।\nআপনার কোন বিষয়ে প্রশ্ন আছে জানান।`;
  } else if (language === 'ta') {
    return `${langMeta.greeting} உங்கள் தொழிலை வெற்றிகரமாக நடத்த 3 முக்கிய குறிப்புகள்:\n1. **விலை நிர்ணயம்:** மூலப்பொருள் செலவுடன் உங்கள் உழைப்புக்கான கட்டணத்தையும் சேர்க்கவும்.\n2. **பாதுகாப்பு:** பணம் பெற ஒருபோதும் UPI PIN ஐ உள்ளிட வேண்டாம்.\n3. **டிஜிட்டல் விற்பனை:** WhatsApp Business கேட்லாக் மூலம் புதிய வாடிக்கையாளர்களை அடையுங்கள்.\nஉங்களுக்கு என்ன உதவி தேவை?`;
  } else if (language === 'te') {
    return `${langMeta.greeting} మీ వ్యాపార విజయానికి 3 ముఖ్యమైన సూత్రాలు:\n1. **సరైన లాభం:** ముడి సరుకులతో పాటు మీ శ్రమ ఖర్చును కూడా లెక్కించండి.\n2. **భద్రత:** డబ్బులు స్వీకరించడానికి ఎప్పుడూ UPI PIN ఎంటర్ చేయవద్దు.\n3. **మార్కెటింగ్:** WhatsApp Business ద్వారా మీ ఉత్పత్తులను ప్రచారం చేయండి.\nమీకు ఏ అంశంలో సహాయం కావాలి?`;
  } else if (language === 'gu') {
    return `${langMeta.greeting} વ્યવસાયમાં પ્રગતિ અને નફા માટે 3 સુવર્ણ નિયમો:\n1. **કિંમત અને નફો:** કાચા માલ સાથે તમારી મહેનત અને પેકિંગ ખર્ચ હંમેશા ઉમેરો.\n2. **ડિજિટલ સુરક્ષા:** પૈસા મેળવવા માટે ક્યારેય UPI PIN નાખવો પડતો નથી.\n3. **ગ્રાહક સેવા:** વોટ્સએપ બિઝનેસ કેટેલોગ બનાવી ગ્રાહકો સુધી પહોંચો.\nતમને કયા વિષયમાં સહાય જોઈએ છે?`;
  } else if (language === 'kn') {
    return `${langMeta.greeting} ನಿಮ್ಮ ವ್ಯವಹಾರದ ಬೆಳವಣಿಗೆಗೆ 3 ಮುಖ್ಯ ಸೂತ್ರಗಳು:\n1. **ಬೆಲೆ ನಿಗದಿ:** ಕಚ್ಚಾ ಸಾಮಗ್ರಿಗಳ ಜೊತೆಗೆ ನಿಮ್ಮ ಶ್ರಮದ ವೆಚ್ಚವನ್ನೂ ಸೇರಿಸಿ ಲೆಕ್ಕ ಹಾಕಿ.\n2. **ಡಿಜಿಟಲ್ ಸುರಕ್ಷತೆ:** ಹಣ ಸ್ವೀಕರಿಸಲು ಎಂದಿಗೂ UPI PIN ನಮೂದಿಸಬೇಡಿ.\n3. **ಮಾರ್ಕೆಟಿಂಗ್:** WhatsApp Business ಕ್ಯಾಟಲಾಗ್ ಮೂಲಕ ಪ್ರಚಾರ ಮಾಡಿ.\nನಿಮಗೆ ಯಾವ ವಿಷಯದಲ್ಲಿ ಮಾಹಿತಿ ಬೇಕು?`;
  } else {
    // English default
    if (query.includes('profit') || query.includes('price') || query.includes('cost') || query.includes('margin')) {
      return `Hello! Here is the golden formula to calculate your profit:\n\n1. **Total Cost** = Raw Materials + Your Labor/Time + Packaging & Transport.\n2. **Selling Price** = Total Cost + Your Desired Margin (usually 25% to 40%).\n3. **Key tip:** Never treat your own time as free! Always include reasonable labor charges in the cost.\n\nTry our interactive **Profit Calculator** in the Business Toolkit tab!`;
    }
    if (query.includes('upi') || query.includes('otp') || query.includes('safety') || query.includes('scam') || query.includes('pin')) {
      return `The #1 Golden Rule of Digital Safety:\n\n⚠️ **You NEVER need to enter your UPI PIN to RECEIVE money.** Entering a UPI PIN always deducts money from your account.\n\n1. Never share OTP or UPI PIN with anyone, even if they claim to be from the bank.\n2. Beware of fake payment screenshots. Always verify incoming money in your bank SMS or soundbox.`;
    }
    return `Welcome to SakhiBiz! As your digital mentor, I am here to help you grow your venture.\n\nCore micro-business foundations:\n1. Maintain a daily ledger of income and expenses.\n2. Offer fair, profitable pricing that respects your time.\n3. Use secure digital payment methods like UPI QR.\n\nHow can I help you today? Ask about pricing, marketing, safe payments, or government schemes!`;
  }
}

// Parse request body for Vercel Serverless environment
async function parseBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS & Methods
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await parseBody(req);
    const { message, language = 'hi', history = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'A valid message string is required.' });
    }

    if (message.length > 1500) {
      return res.status(400).json({ error: 'Message exceeds 1500 characters limit.' });
    }

    const validLanguages = ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'];
    const cleanLang = validLanguages.includes(language) ? language : 'hi';
    const langMeta = LANGUAGE_META[cleanLang] || LANGUAGE_META['hi'];
    // Try AI generation with multi-key failover across Groq & Gemini
    try {
      const { AiKeyManager } = await import('../../src/server/ai/keyManager');

      const systemPrompt = `
${SAKHI_SYSTEM_INSTRUCTION}
Target Language: ${langMeta.name} (${langMeta.script})
Always respond concisely (under 180 words), step-by-step, with practical examples in fluent, natural, culturally warm ${langMeta.name} using ${langMeta.script}. Address the learner warmly with a traditional greeting (${langMeta.greeting}).
`.trim();

      const formattedHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .filter((item: any) => typeof item?.text === 'string' && item.text.trim().length > 0)
            .map((item: any) => ({
              role: (item.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
              text: item.text.slice(0, 400),
            }))
        : [];

      const completion = await AiKeyManager.generateCompletion({
        preferredProvider: 'groq',
        systemPrompt,
        userPrompt: message.trim(),
        history: formattedHistory,
        temperature: 0.5,
        maxTokens: 600,
      });

      return res.status(200).json({
        reply: completion.text || `${langMeta.greeting} ${getRegionalFallback(message, cleanLang)}`,
        source: `${completion.provider}:${completion.model}`,
        language: cleanLang,
        retries: completion.retries,
      });
    } catch (aiErr: any) {
      console.warn(
        'AI generation failed or unavailable across providers, using regional knowledge engine:',
        aiErr?.message || aiErr
      );
      return res.status(200).json({
        reply: getRegionalFallback(message, cleanLang),
        source: 'regional_knowledge_engine',
        language: cleanLang,
      });
    }
  } catch (err: any) {
    console.error('SakhiBiz AI handler error:', err?.message || 'unexpected error');
    return res.status(500).json({
      error: 'An internal error occurred processing the chat request.',
    });
  }
}
