import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../utils/translations';

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'navbar' | 'landing' | 'footer' | 'inline';
  className?: string;
  id?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLang,
  onLanguageChange,
  variant = 'navbar',
  className = '',
  id = 'sakhibiz-language-selector',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLanguage =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === currentLang) ||
    SUPPORTED_LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelect = (lang: SupportedLanguage) => {
    onLanguageChange(lang.code);
    setIsOpen(false);
  };

  // Button styles based on variant
  const getButtonStyles = () => {
    switch (variant) {
      case 'landing':
        return 'bg-white/95 hover:bg-white text-[#18392B] border border-white/20 shadow-lg px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold backdrop-blur-md';
      case 'footer':
        return 'bg-[#1c3f30] hover:bg-[#244f3d] text-white border border-[#2d5c47] px-3.5 py-2 rounded-xl text-xs font-medium';
      case 'inline':
        return 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-medium shadow-sm';
      case 'navbar':
      default:
        return 'bg-[#1c3f30] hover:bg-[#244f3d] text-[#E8ECE9] hover:text-white border border-[#2d5c47] px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
      id={id}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current language: ${activeLanguage.nativeName} (${activeLanguage.name}). Click to change language.`}
        className={`flex items-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E07A5F] ${getButtonStyles()}`}
      >
        <Globe
          className={`w-3.5 h-3.5 shrink-0 ${
            variant === 'landing' ? 'text-[#E07A5F]' : 'text-[#FFC4B3]'
          }`}
        />
        <span className="font-bold tracking-wide">
          {activeLanguage.nativeName}
        </span>
        <span
          className={`text-[11px] font-normal hidden sm:inline ${
            variant === 'landing' ? 'text-gray-500' : 'text-[#A2B6AC]'
          }`}
        >
          ({activeLanguage.name})
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Select platform language"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[80vh] overflow-y-auto"
        >
          <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              अपनी भाषा चुनें / Select Language
            </span>
            <span className="text-[10px] font-semibold bg-[#E07A5F]/10 text-[#E07A5F] px-2 py-0.5 rounded-full">
              8 भाषाएँ
            </span>
          </div>

          <div className="p-1.5 space-y-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors text-xs ${
                    isSelected
                      ? 'bg-[#18392B] text-white font-semibold'
                      : 'hover:bg-[#F4F1EA] text-gray-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tracking-tight">
                        {lang.nativeName}
                      </span>
                      <span
                        className={`text-xs ${
                          isSelected ? 'text-[#FFD5C8]' : 'text-gray-500'
                        }`}
                      >
                        {lang.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-[#C9D6CE]' : 'text-gray-400'
                      }`}
                    >
                      {lang.region}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#E07A5F] flex items-center justify-center text-white shrink-0 shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 mt-1 border-t border-gray-100 bg-gray-50/70 rounded-b-xl text-[10px] text-gray-500 flex items-center justify-between">
            <span>Fallback: English automatically</span>
            <span className="font-medium text-[#18392B]">SakhiBiz Multilingual</span>
          </div>
        </div>
      )}
    </div>
  );
};
