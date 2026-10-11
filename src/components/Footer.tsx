import React from 'react';
import { 
  Heart, 
  ShieldCheck, 
  PhoneCall, 
  ExternalLink, 
  BookOpen, 
  Calculator, 
  Sparkles, 
  HelpCircle 
} from 'lucide-react';
import { Language } from '../types';
import { getText } from '../utils/translations';
import { LanguageSelector } from './LanguageSelector';

interface FooterProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
  onOpenFeedback: () => void;
  onLanguageChange?: (lang: Language) => void;
}

export const Footer: React.FC<FooterProps> = ({ currentLang, onNavigate, onOpenFeedback, onLanguageChange }) => {
  return (
    <footer className="bg-[#122A20] text-[#E8ECE9] border-t border-[#1d4232] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Brand & Mission */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E07A5F] to-[#f4987e] flex items-center justify-center text-white font-serif font-bold text-xl">
                स
              </div>
              <span className="font-serif text-2xl font-extrabold text-white">SakhiBiz</span>
            </div>
            <p className="text-sm text-[#C9D6CE] leading-relaxed mb-4">
              {getText('footerAboutText', currentLang)}
            </p>
            <div className="inline-flex items-center gap-2 text-xs bg-[#1c3f30] px-3 py-1.5 rounded-lg border border-[#2d5c47] text-[#FFD5C8]">
              <Heart className="w-3.5 h-3.5 text-[#E07A5F] fill-current" />
              <span>
                {currentLang === 'hi' 
                  ? 'महिला सशक्तिकरण एवं आत्मनिर्भर भारत की ओर' 
                  : 'Empowering Grassroots Women Entrepreneurs'}
              </span>
            </div>
          </div>

          {/* Column 2: Quick Learning Links */}
          <div>
            <h4 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#E07A5F]" />
              {currentLang === 'hi' ? 'सीखने के मुख्य ट्रैक' : 'Learning Tracks'}
            </h4>
            <ul className="space-y-2 text-sm text-[#C9D6CE]">
              <li>
                <button 
                  onClick={() => onNavigate('courses')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• लागत, बिक्री मूल्य और मुनाफा' : '• Cost, Selling Price & Profit'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('courses')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• सुरक्षित डिजिटल भुगतान (UPI)' : '• Safe Digital Payments (UPI)'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('courses')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• व्हाट्सएप बिजनेस मार्केटिंग' : '• WhatsApp Business Marketing'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('resources')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• मुद्रा लोन और उद्यम आधार' : '• Mudra Loan & Udyam MSME'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Business Toolkit */}
          <div>
            <h4 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#E07A5F]" />
              {currentLang === 'hi' ? 'व्यावसायिक उपकरण' : 'Business Toolkit'}
            </h4>
            <ul className="space-y-2 text-sm text-[#C9D6CE]">
              <li>
                <button 
                  onClick={() => onNavigate('tools')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• प्रॉफिट कैलकुलेटर (Profit Calculator)' : '• Profit & Margin Calculator'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('tools')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• दैनिक खर्च डायरी (Expense Tracker)' : '• Daily Expense Tracker'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('tools')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• मूल्य निर्धारण सहायक (Pricing Assistant)' : '• Product Pricing Assistant'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('tools')} 
                  className="hover:text-white transition-colors text-left"
                >
                  {currentLang === 'hi' ? '• डिजिटल सुरक्षा गाइड (Safety Checklist)' : '• Digital Safety & Fraud Checklist'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('assistant')} 
                  className="hover:text-white transition-colors text-left text-[#FFD5C8] font-medium"
                >
                  {currentLang === 'hi' ? '• सखी AI मेंटर से पूछें' : '• Ask Sakhi AI Mentor'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Official Helpline Directory */}
          <div>
            <h4 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#E07A5F]" />
              {currentLang === 'hi' ? 'आधिकारिक हेल्पलाइन निर्देशिका' : 'Official Helplines'}
            </h4>
            <div className="space-y-3 text-xs text-[#C9D6CE]">
              <div className="bg-[#1c3f30] p-2.5 rounded-lg border border-[#2d5c47]">
                <div className="flex justify-between items-center text-white font-bold mb-0.5">
                  <span>1930</span>
                  <span className="text-[10px] text-[#A2B6AC]">cybercrime.gov.in</span>
                </div>
                <p className="text-[#A2B6AC]">
                  {currentLang === 'hi' ? 'राष्ट्रीय साइबर अपराध व वित्तीय धोखाधड़ी' : 'National Financial Cyber Fraud'}
                </p>
              </div>

              <div className="bg-[#1c3f30] p-2.5 rounded-lg border border-[#2d5c47]">
                <div className="flex justify-between items-center text-white font-bold mb-0.5">
                  <span>1800-180-6763</span>
                  <span className="text-[10px] text-[#A2B6AC]">champions.gov.in</span>
                </div>
                <p className="text-[#A2B6AC]">
                  {currentLang === 'hi' ? 'MSME सूक्ष्म उद्योग सहायता व लोन जानकारी' : 'MSME Champions Helpline'}
                </p>
              </div>

              <div className="bg-[#1c3f30] p-2.5 rounded-lg border border-[#2d5c47]">
                <div className="flex justify-between items-center text-white font-bold mb-0.5">
                  <span>181</span>
                  <span className="text-[10px] text-[#A2B6AC]">Toll-Free</span>
                </div>
                <p className="text-[#A2B6AC]">
                  {currentLang === 'hi' ? 'महिला हेल्पलाइन (संकटकालीन सहायता)' : 'Women in Distress 24x7 Helpline'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer & Transparency Note */}
        <div className="bg-[#173327] border border-[#224b38] rounded-xl p-4 text-xs text-[#A2B6AC] leading-relaxed mb-8">
          <p className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#E07A5F] shrink-0 mt-0.5" />
            <span>
              <strong>{currentLang === 'hi' ? 'शैक्षिक एवं पारदर्शी सूचना:' : 'Educational Transparency Notice:'}</strong>{' '}
              {currentLang === 'hi'
                ? 'सखीबिज एक शैक्षिक ई-लर्निंग एवं कौशल संवर्धन पहल है। यहाँ दी गई सामग्री सूक्ष्म उद्यमियों को जागरूक करने के लिए है। किसी भी सरकारी योजना या बैंक लोन के लिए कभी किसी अनाधिकृत व्यक्ति को कमीशन न दें; हमेशा सीधे बैंक शाखा अथवा आधिकारिक सरकारी वेबसाइटों (.gov.in) पर ही आवेदन करें।'
                : 'SakhiBiz is an educational platform dedicated to rural & semi-urban digital business literacy. All calculators, guides, and AI suggestions are educational in nature. Always verify official loan terms and schemes directly with banking institutions and verified .gov.in portals.'}
            </span>
          </p>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#1d4232] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#A2B6AC] gap-4">
          <p>{getText('copyrightText', currentLang)}</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {onLanguageChange && (
              <LanguageSelector
                currentLang={currentLang}
                onLanguageChange={onLanguageChange}
                variant="footer"
                id="footer-language-selector"
              />
            )}
            <button 
              onClick={onOpenFeedback}
              className="hover:text-white transition-colors underline"
            >
              {currentLang === 'hi' ? 'सुझाव व प्रतिक्रिया दें' : 'Give Feedback'}
            </button>
            <span>•</span>
            <span className="text-[#C9D6CE]">
              {getText('localPersistence', currentLang)}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
