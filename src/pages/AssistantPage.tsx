import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RotateCcw, 
  HelpCircle, 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Language, ChatMessage } from '../types';
import { getText } from '../utils/translations';
import { StorageService } from '../services/storage';

interface AssistantPageProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({ currentLang, onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => StorageService.getChatHistory());
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SUGGESTED_QUESTIONS_MAP: Record<Language, string[]> = {
    hi: [
      'कुर्ती सिलने में अपनी मेहनत का खर्च कैसे जोड़ूं?',
      'पैसे लेने के लिए UPI PIN क्यों नहीं डालते?',
      'WhatsApp Business पर आचार का कैटलॉग कैसे बनाएं?',
      'शिशु मुद्रा लोन के लिए कौन से कागज चाहिए?',
      'ग्राहकों से समय पर उधारी कैसे वसूलें?',
    ],
    mr: [
      'कुर्ती शिवताना स्वतःच्या श्रमाचा खर्च कसा जोडू?',
      'पैसे स्वीकारण्यासाठी UPI PIN का टाकू नये?',
      'WhatsApp Business वर उत्पादनांचा कॅटलॉग कसा बनवू?',
      'मुद्रा लोनसाठी कोणती कागदपत्रे लागतात?',
    ],
    bn: [
      'পণ্য তৈরিতে নিজের শ্রমের মূল্য কীভাবে ধরব?',
      'টাকা পাওয়ার জন্য কেন UPI PIN দিতে হয় না?',
      'WhatsApp Business-এ কীভাবে ক্যাটালগ তৈরি করব?',
      'মুদ্রা লোনের জন্য কী কী নথি প্রয়োজন?',
    ],
    ta: [
      'தையல் தொழிலில் உழைப்பு கூலியை எவ்வாறு கணக்கிடுவது?',
      'பணம் பெற ஏன் UPI PIN உள்ளிடக்கூடாது?',
      'WhatsApp Business இல் கேட்லாக் உருவாக்குவது எப்படி?',
      'முத்ரா கடனுக்கு என்ன ஆவணங்கள் தேவை?',
    ],
    te: [
      'దుస్తులు కుట్టడంలో శ్రమ ఖర్చును ఎలా లెక్కించాలి?',
      'డబ్బులు స్వీకరించడానికి UPI PIN ఎందుకు ఎంటర్ చేయకూడదు?',
      'WhatsApp Business లో ఉత్పత్తుల కేటలాగ్ ఎలా సృష్టించాలి?',
    ],
    gu: [
      'ઉત્પાદન બનાવવામાં પોતાની મહેનતનો ખર્ચ કેવી રીતે ઉમેરવો?',
      'પૈસા મેળવતી વખતે UPI PIN કેમ ના નાખવો?',
      'વોટ્સએપ બિઝનેસ પર કેટેલોગ કેવી રીતે બનાવવો?',
    ],
    kn: [
      'ಉತ್ಪಾದನೆಯಲ್ಲಿ ಸ್ವಂತ ಶ್ರಮದ ವೆಚ್ಚವನ್ನು ಹೇಗೆ ಲೆಕ್ಕ ಹಾಕಬೇಕು?',
      'ಹಣ ಸ್ವೀಕರಿಸಲು UPI PIN ಏಕೆ ನಮೂದಿಸಬಾರದು?',
      'WhatsApp Business ಕ್ಯಾಟಲಾಗ್ ರಚಿಸುವುದು ಹೇಗೆ?',
    ],
    en: [
      'How do I calculate labor cost for tailoring?',
      'Why is UPI PIN never required to receive money?',
      'How to set up a WhatsApp Business product catalog?',
      'What documents are needed for a Shishu Mudra loan?',
      'How to politely follow up on customer pending payments?',
    ],
  };

  const suggestedQuestions = SUGGESTED_QUESTIONS_MAP[currentLang] || SUGGESTED_QUESTIONS_MAP.hi;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          language: currentLang,
          history: newHistory.slice(-6).map((m) => ({
            role: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      const botMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'sakhi',
        text: data.reply || (currentLang === 'hi' ? 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।' : 'Hello! I am here to help you.'),
        timestamp: new Date().toISOString(),
        source: data.source || 'gemini-3.8-flash',
      };

      const finalMessages = [...newHistory, botMessage];
      setMessages(finalMessages);
      StorageService.saveChatHistory(finalMessages);
    } catch (err) {
      console.error('Failed to get AI response:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'sakhi',
        text: currentLang === 'hi'
          ? 'नमस्ते दीदी! नेटवर्क में थोड़ी रुकावट आई है, लेकिन आप हमारे "Business Tools" में जाकर Profit Calculator या Digital Safety Guide का तुरंत इस्तेमाल कर सकती हैं!'
          : 'Network hiccup occurred. Please feel free to use our offline Profit Calculator and Safety Guide in the Business Toolkit tab!',
        timestamp: new Date().toISOString(),
        source: 'fallback',
      };
      setMessages([...newHistory, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    const defaultWelcome: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'sakhi',
      text: currentLang === 'hi'
        ? 'नमस्ते दीदी! मैं आपकी सखी (Sakhi) हूँ। व्यवसाय, मूल्य निर्धारण, मार्केटिंग या सुरक्षा के बारे में कोई भी प्रश्न पूछें!'
        : 'Hello! I am Sakhi, your business mentor. Ask me any question about pricing, marketing, or safe digital payments!',
      timestamp: new Date().toISOString(),
      source: 'knowledge-base',
    };
    setMessages([defaultWelcome]);
    StorageService.saveChatHistory([defaultWelcome]);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-6 sm:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-[82vh]">
        {/* Assistant Header Card */}
        <div className="bg-white rounded-t-3xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#18392B] to-[#244f3d] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-[#FFD5C8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg sm:text-xl font-bold text-[#18392B]">
                  {getText('aiTitle', currentLang)}
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {getText('aiSubtitle', currentLang)}
              </p>
            </div>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Clear Chat"
            aria-label="Clear Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 bg-[#FBF9F5] border-x border-gray-200 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Disclaimer pill */}
          <div className="bg-amber-50/80 border border-amber-200/60 p-3 rounded-2xl text-[11px] text-amber-900 leading-relaxed text-center max-w-xl mx-auto shadow-sm">
            {getText('aiDisclaimer', currentLang)}
          </div>

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#18392B] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                    स
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                    isUser
                      ? 'bg-[#18392B] text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                  {msg.source && !isUser && (
                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                      Powered by Sakhi Regional AI
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#E07A5F] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                    आप
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-[#18392B] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                स
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#18392B] animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-[#18392B] animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-[#18392B] animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-xs text-gray-500 font-medium ml-1">
                  {currentLang === 'hi' ? 'सखी सोच रही हैं...' : 'Sakhi is typing...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="bg-white border-x border-gray-200 px-4 py-2 overflow-x-auto flex gap-2 scrollbar-none">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3 py-1 bg-[#FBF9F5] hover:bg-[#E8ECE9] border border-gray-200 rounded-full text-[11px] font-medium text-gray-700 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
            >
              <Lightbulb className="w-3 h-3 text-[#E07A5F]" />
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* Input Bar Card */}
        <div className="bg-white rounded-b-3xl border border-gray-200 p-4 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={getText('askPlaceholder', currentLang)}
              className="flex-1 px-4 py-3 bg-[#FBF9F5] border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#18392B] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="p-3 bg-[#E07A5F] hover:bg-[#d66b50] disabled:opacity-40 text-white rounded-xl shadow-sm transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
