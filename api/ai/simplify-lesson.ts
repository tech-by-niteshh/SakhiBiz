import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface VercelRequest extends IncomingMessage {
  body?: any;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => this;
}

async function parseBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
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
    const { topic, context, language = 'hi' } = body;
    const validLanguages = ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'];
    const cleanLang = validLanguages.includes(language) ? language : 'hi';

    const LANGUAGE_NAMES: Record<string, { name: string; script: string }> = {
      hi: { name: 'Hindi', script: 'Devanagari script' },
      en: { name: 'English', script: 'Simple English' },
      mr: { name: 'Marathi', script: 'Devanagari script (मराठी)' },
      bn: { name: 'Bengali', script: 'Bengali script (বাংলা)' },
      ta: { name: 'Tamil', script: 'Tamil script (தமிழ்)' },
      te: { name: 'Telugu', script: 'Telugu script (తెలుగు)' },
      gu: { name: 'Gujarati', script: 'Gujarati script (ગુજરાતી)' },
      kn: { name: 'Kannada', script: 'Kannada script (ಕನ್ನಡ)' },
    };

    const langInfo = LANGUAGE_NAMES[cleanLang] || LANGUAGE_NAMES['hi'];
    try {
      const { AiKeyManager } = await import('../../src/server/ai/keyManager');

      const prompt = `
You are Sakhi, a patient educator for rural and semi-urban Indian women entrepreneurs.
Explain this business concept in very simple, storytelling everyday terms with a relatable rural micro-business example (e.g. tailoring, making snacks, selling dairy or textiles).

Concept: "${typeof topic === 'string' ? topic.slice(0, 200) : ''}"
Context: "${typeof context === 'string' ? context.slice(0, 500) : ''}"
Target Language: ${langInfo.name} (${langInfo.script})

Format:
- 1 clear headline
- Simple real-life grassroots micro-business example
- 3 key practical bullet points
- 1 practical takeaway
Respond entirely and fluently in ${langInfo.name} using ${langInfo.script}. Keep under 150 words.
`;

      const completion = await AiKeyManager.generateCompletion({
        preferredProvider: 'gemini',
        userPrompt: prompt,
        temperature: 0.4,
        maxTokens: 500,
      });

      if (completion?.text) {
        return res.status(200).json({
          simplifiedContent: completion.text,
          source: `${completion.provider}:${completion.model}`,
          language: cleanLang,
          retries: completion.retries,
        });
      }
    } catch (e: any) {
      console.warn('AI simplification deferred to curated regional fallback:', e?.message || 'unknown error');
    }

    let simplified = '';
    if (cleanLang === 'hi') {
      simplified = `**सरल शब्दों में समझें: ${topic || 'यह व्यावसायिक नियम'}**\n\n**उदाहरण:** मान लीजिए सुनीता दीदी एक कुर्ती सिलती हैं। कपड़े का खर्च ₹200 हुआ और धागे-बटन का ₹20। यदि वे अपनी 3 घंटे की सिलाई मेहनत के ₹100 न जोड़ें, तो वे असल में घाटे में रहेंगी! जब वे कुल लागत ₹320 में ₹80 अपना मुनाफा जोड़कर ₹400 में बेचेंगी, तभी उनका व्यापार तरक्की करेगा।\n\n- **मुख्य सीख 1:** अपना समय कभी मुफ़्त मत मानिए।\n- **मुख्य सीख 2:** हर छोटे खर्चे (बिजली, धागा, किराया) को जोड़ें।\n- **मुख्य सीख 3:** हिसाब साफ़ रखें ताकि महीने के अंत में बचत दिखे।`;
    } else if (cleanLang === 'mr') {
      simplified = `**सोप्या भाषेत समजा: ${topic || 'व्यावसायिक नियम'}**\n\n**उदाहरण:** समजा अनिता ताई कुर्ती शिवतात. कापडाचा खर्च ₹२०० आणि धागा ₹२० झाला. जर त्यांनी स्वतःच्या श्रमाचे ₹१०० धरले नाहीत, तर त्या तोट्यात राहतील! जेव्हा त्या एकूण खर्च ₹३२० वर ₹८० नफा जोडून ₹४०० ला विकतील, तेव्हाच खरी कमाई होईल.\n\n- **मुख्य सूत्र १:** स्वतःची मेहनत कधीही मोफत धरू नका.\n- **मुख्य सूत्र २:** प्रत्येक लहान खर्च हिशोबात नोंदवा.\n- **मुख्य सूत्र ३:** दैनंदिन नोंद ठेवा.`;
    } else if (cleanLang === 'bn') {
      simplified = `**সহজ কথায় বুঝুন: ${topic || 'ব্যবসায়িক নিয়ম'}**\n\n**উদাহরণ:** মনে করুন অনিতা দিদি আচার তৈরি করেন। মশলা ও কাঁচামালের খরচ ₹২০০। কিন্তু যদি নিজের ৩ ঘণ্টার পরিশ্রমের মূল্য না ধরেন, তবে প্রকৃত লাভ দেখা যাবে না। কাঁচামাল ও শ্রম মিলিয়ে ₹৩২০ খরচ ধরে তার উপর ₹৮০ লাভ যোগ করে ₹৪০০ মূল্যে বিক্রি করাই সঠিক নিয়ম।\n\n- **মূল শিক্ষা ১:** নিজের সময় ও পরিশ্রমের সঠিক মূল্য দিন।\n- **মূল শিক্ষা ২:** প্রতিটি ছোট খরচ খাতায় লিখে রাখুন।\n- **মূল শিক্ষা ৩:** নিয়মিত ডিজিটাল মাধ্যমে বিক্রি বাড়ান।`;
    } else if (cleanLang === 'ta') {
      simplified = `**எளிய முறையில் புரிந்துகொள்ளுங்கள்: ${topic || 'வணிக விதி'}**\n\n**உதாரணம்:** அனிதா அக்கா தையல் தைக்கிறார். துணி செலவு ₹200 மற்றும் நூல் செலவு ₹20. தன் உழைப்புக்கு ₹100 சேர்க்காவிட்டால் அது நஷ்டமே! மொத்த செலவு ₹320 உடன் ₹80 லாபம் சேர்த்து ₹400க்கு விற்றால் தான் தொழில் வளரும்.\n\n- **முக்கிய குறிப்பு 1:** உங்கள் உழைப்பை இலவசமாக கருதாதீர்கள்.\n- **முக்கிய குறிப்பு 2:** சிறு செலவுகளையும் கணக்கில் சேர்க்கவும்.\n- **முக்கிய குறிப்பு 3:** தினசரி கணக்கை சரியாக பராமரிக்கவும்.`;
    } else if (cleanLang === 'te') {
      simplified = `**సులభంగా అర్థం చేసుకోండి: ${topic || 'వ్యాపార సూత్రం'}**\n\n**ఉదాహరణ:** అనిత అక్క బట్టలు కుడుతుంది. క్లాత్ ఖర్చు ₹200, దారాలు ₹20. తన 3 గంటల కష్టానికి ₹100 కలపకపోతే నష్టమే వస్తుంది! మొత్తం ఖర్చు ₹320 పై ₹80 లాభం కలిపి ₹400కు అమ్మితేనే వ్యాపారం వృద్ధి చెందుతుంది.\n\n- **ముఖ్య సూత్రం 1:** మీ శ్రమను ఉచితంగా భావించవద్దు.\n- **ముఖ్య సూత్రం 2:** ప్రతి చిన్న ఖర్చును లెక్కించండి.\n- **ముఖ్య సూత్రం 3:** లాభాన్ని స్పష్టంగా నిర్ణయించండి.`;
    } else if (cleanLang === 'gu') {
      simplified = `**સરળ શબ્દોમાં સમજો: ${topic || 'વ્યાપાર નિયમ'}**\n\n**ઉદાહરણ:** માની લો કે અનિતા બહેન કુર્તી સીવે છે. કાપડનો ખર્ચ ₹200 અને દોરા-બટનનો ₹20 થયો. જો તેઓ પોતાની 3 કલાકની મહેનતના ₹100 ન ઉમેરે, તો તેઓ નુકસાનમાં રહેશે! જ્યારે કુલ પડતર ₹320 માં ₹80 નફો ઉમેરીને ₹400 માં વેચશે, ત્યારે જ સાચો નફો થશે.\n\n- **મુખ્ય શીખ 1:** તમારી મહેનતને ક્યારેય મફત ન ગણો.\n- **મુખ્ય શીખ 2:** દરેક નાના ખર્ચની નોંધ રાખો.\n- **મુખ્ય શીખ 3:** રોજિંદો હિસાબ ચોખ્ખો રાખો.`;
    } else if (cleanLang === 'kn') {
      simplified = `**ಸರಳವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ: ${topic || 'ವ್ಯವಹಾರ ಸೂತ್ರ'}**\n\n**ಉದಾಹರಣೆ:** ಅನಿತಾ ಅಕ್ಕ ಬಟ್ಟೆ ಹೊಲಿಯುತ್ತಾರೆ. ಬಟ್ಟೆ ಖರ್ಚು ₹200 ಮತ್ತು ದಾರ ₹20. ತಮ್ಮ 3 ಗಂಟೆಗಳ ಶ್ರಮಕ್ಕೆ ₹100 ಸೇರಿಸದಿದ್ದರೆ ನಷ್ಟವಾಗುತ್ತದೆ! ಒಟ್ಟು ವೆಚ್ಚ ₹320 ಕ್ಕೆ ₹80 ಲಾಭ ಸೇರಿಸಿ ₹400 ಕ್ಕೆ ಮಾರಾಟ ಮಾಡಿದರೆ ಮಾತ್ರ ನಿಜವಾದ ಲಾಭ ದೊರೆಯುತ್ತದೆ.\n\n- **ಮುಖ್ಯ ಅಂಶ 1:** ನಿಮ್ಮ ಶ್ರಮವನ್ನು ಉಚಿತವೆಂದು ತಿಳಿಯಬೇಡಿ.\n- **ಮುಖ್ಯ ಅಂಶ 2:** ಎಲ್ಲಾ ಸಣ್ಣ ಖರ್ಚುಗಳನ್ನು ಲೆಕ್ಕ ಹಾಕಿ.\n- **ಮುಖ್ಯ ಅಂಶ 3:** ಪ್ರತಿದಿನವೂ ಖರ್ಚು-ವೆಚ್ಚದ ಲೆಕ್ಕ ಇರಿಸಿ.`;
    } else {
      simplified = `**In Simple Terms: ${topic || 'Business Concept'}**\n\n**Real-life Example:** If Anita makes a batch of homemade pickles, her raw spices and jars cost ₹300. If she spends 4 hours of hard work but charges ₹0 for her labor, she isn't making real profit! When she counts ₹150 for her labor and adds a ₹100 profit margin, selling the batch for ₹550 gives her true growth.\n\n- **Key Takeaway 1:** Your time and effort have real monetary value.\n- **Key Takeaway 2:** Always account for small overheads like oil, packaging, and travel.\n- **Key Takeaway 3:** Maintain a written daily record.`;
    }

    return res.status(200).json({
      simplifiedContent: simplified,
      source: 'curated-regional-guide',
      language: cleanLang,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'An internal error occurred simplifying the lesson.',
    });
  }
}
