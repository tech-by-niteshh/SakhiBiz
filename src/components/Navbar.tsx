import React, { useState } from 'react';
import { 
  BookOpen, 
  Calculator, 
  Sparkles, 
  User, 
  Menu, 
  X, 
  Globe, 
  Award, 
  FileText, 
  LogOut,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { t, getText } from '../utils/translations';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isPrivileged = user.role === 'ADMIN' || user.role === 'MODERATOR';

  const navLinks = [
    { id: 'home', label: getText('navHome', currentLang), icon: BookOpen },
    { id: 'courses', label: getText('navCourses', currentLang), icon: BookOpen },
    { id: 'tools', label: getText('navTools', currentLang), icon: Calculator },
    { id: 'assistant', label: getText('navAssistant', currentLang), icon: Sparkles, highlight: true },
    { id: 'dashboard', label: getText('navDashboard', currentLang), icon: Award },
    { id: 'resources', label: getText('navResources', currentLang), icon: FileText },
    ...(isPrivileged
      ? [
          {
            id: 'admin',
            label: currentLang === 'hi' ? 'एडमिन पैनल' : 'Admin Panel',
            icon: ShieldCheck,
            adminOnly: true,
          },
        ]
      : []),
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#18392B] text-white shadow-md border-b border-[#244f3d]">
      {/* Top micro banner */}
      <div className="bg-[#122A20] px-4 py-1.5 text-xs text-[#E8ECE9] flex justify-between items-center border-b border-[#1c3f30]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-[#E07A5F]/20 text-[#FFC4B3] border border-[#E07A5F]/40 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E07A5F] animate-pulse"></span>
            {currentLang === 'hi' ? 'महिला उद्यमिता संवर्धन मंच' : 'Grassroots Women Entrepreneurship Platform'}
          </span>
          <span className="hidden md:inline text-xs text-[#A2B6AC]">
            {getText('subtagline', currentLang)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Cyber Helpline Badge */}
          <span className="hidden sm:inline-flex items-center gap-1 text-[#E8ECE9]">
            <span className="text-[#FFC4B3] font-semibold">1930</span>
            <span className="text-[11px] text-[#A2B6AC]">{currentLang === 'hi' ? 'साइबर हेल्पलाइन' : 'Cyber Helpline'}</span>
          </span>

          {/* Language Selector */}
          <LanguageSelector
            currentLang={currentLang}
            onLanguageChange={onLanguageChange}
            variant="navbar"
            id="navbar-language-selector"
          />
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E07A5F] to-[#f4987e] flex items-center justify-center text-white shadow-md transform group-hover:scale-105 transition-transform">
              <span className="font-serif text-2xl font-bold tracking-tight">स</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-2xl font-extrabold tracking-tight text-white">
                  SakhiBiz
                </span>
                <span className="text-xs font-medium text-[#FFC4B3] bg-[#E07A5F]/20 border border-[#E07A5F]/40 px-1.5 py-0.2 rounded">
                  सखीबिज
                </span>
              </div>
              <p className="text-[10px] text-[#A2B6AC] hidden sm:block tracking-wide">
                {currentLang === 'hi' ? 'हुनर • व्यापार • आत्मनिर्भरता' : 'Skills • Business • Independence'}
              </p>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#244f3d] text-[#FFD5C8] shadow-inner font-semibold border-b-2 border-[#E07A5F]'
                      : 'text-[#E8ECE9] hover:bg-[#1c3f30] hover:text-white'
                  } ${link.highlight ? 'text-[#FFD5C8] font-semibold' : ''}`}
                >
                  <Icon className={`w-4 h-4 ${link.highlight ? 'text-[#E07A5F]' : ''}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-3">
            {/* User profile dropdown or Sign in */}
            <div className="relative">
              {(() => {
                const isGuest = user.id.startsWith('guest-');
                return (
                  <>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 bg-[#244f3d] hover:bg-[#2e624c] border border-[#3b795f] px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all shadow-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#E07A5F] flex items-center justify-center font-bold text-xs text-white">
                        {isGuest ? '?' : user.name.charAt(0) || 'स'}
                      </div>
                      <div className="text-left hidden sm:block max-w-[120px] truncate">
                        <span className="font-semibold block truncate leading-tight">
                          {isGuest ? (currentLang === 'hi' ? 'अतिथि' : 'Guest') : user.name.split(' ')[0]}
                        </span>
                        <span className="text-[10px] text-[#A2B6AC] block">
                          {isGuest
                            ? currentLang === 'hi'
                              ? 'लोकल मोड'
                              : 'Local Mode'
                            : currentLang === 'hi'
                            ? 'सत्यापित'
                            : 'Verified'}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-[#A2B6AC]" />
                    </button>

                    {/* Dropdown Menu */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 text-[#242A27] z-50">
                        <div className="px-4 py-2 border-b border-gray-100 bg-[#FBF9F5]">
                          <p className="text-[11px] text-gray-500 font-medium">
                            {isGuest
                              ? currentLang === 'hi'
                                ? 'वर्तमान स्थिति'
                                : 'Current Session'
                              : currentLang === 'hi'
                              ? 'लॉग इन प्रोफाइल'
                              : 'Signed In As'}
                          </p>
                          <p className="text-sm font-bold text-[#18392B] truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          <span
                            className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              isGuest
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isGuest
                              ? currentLang === 'hi'
                                ? 'अतिथि मोड (लोकल)'
                                : 'Guest Mode (Local)'
                              : currentLang === 'hi'
                              ? 'क्लाउड खाता'
                              : 'Cloud Account'}
                          </span>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleNavClick('dashboard');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-[#FBF9F5] flex items-center gap-2"
                          >
                            <Award className="w-4 h-4 text-[#18392B]" />
                            {getText('navDashboard', currentLang)}
                          </button>
                          <button
                            onClick={() => {
                              onOpenProfile();
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-[#FBF9F5] flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-[#18392B]" />
                            {currentLang === 'hi' ? 'प्रोफ़ाइल एवं प्राथमिकताएं' : 'Profile & Settings'}
                          </button>
                          {isPrivileged && (
                            <button
                              onClick={() => {
                                handleNavClick('admin');
                                setUserDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-[#E07A5F] hover:bg-[#FBF9F5] flex items-center gap-2 border-t border-gray-100"
                            >
                              <ShieldCheck className="w-4 h-4 text-[#E07A5F]" />
                              <span>{currentLang === 'hi' ? 'एडमिन पैनल' : 'Admin Panel'}</span>
                              <span className="ml-auto text-[9px] bg-[#E07A5F]/15 text-[#E07A5F] px-1.5 py-0.5 rounded font-mono font-bold">
                                {user.role}
                              </span>
                            </button>
                          )}
                        </div>

                        <div className="border-t border-gray-100 pt-1">
                          {isGuest ? (
                            <button
                              onClick={() => {
                                onOpenAuth();
                                setUserDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-[#18392B] hover:bg-[#FBF9F5] flex items-center gap-2"
                            >
                              <User className="w-4 h-4 text-[#E07A5F]" />
                              {currentLang === 'hi' ? 'खाता बनाएं / लॉग इन करें' : 'Create Account / Sign In'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onSignOut();
                                setUserDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <LogOut className="w-4 h-4 text-rose-500" />
                              {currentLang === 'hi' ? 'लॉग आउट (साइन आउट)' : 'Sign Out'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[#E8ECE9] hover:bg-[#244f3d] focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#143024] border-t border-[#244f3d] px-4 pt-2 pb-6 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#E07A5F] text-white font-semibold'
                    : 'text-[#E8ECE9] hover:bg-[#1c3f30]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </button>
            );
          })}

          {/* Mobile Language Selector */}
          <div className="py-2">
            <LanguageSelector
              currentLang={currentLang}
              onLanguageChange={onLanguageChange}
              variant="navbar"
              className="w-full"
              id="mobile-language-selector"
            />
          </div>

          <div className="pt-3 border-t border-[#244f3d] flex gap-2">
            <button
              onClick={() => {
                onOpenProfile();
                setMobileMenuOpen(false);
              }}
              className="flex-1 py-2 text-center text-xs font-medium bg-[#244f3d] rounded-lg text-white"
            >
              {currentLang === 'hi' ? 'मेरी प्रोफ़ाइल' : 'My Profile'}
            </button>
            {user.id.startsWith('guest-') ? (
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 text-center text-xs font-medium bg-[#E07A5F] rounded-lg text-white"
              >
                {currentLang === 'hi' ? 'लॉग इन / खाता' : 'Sign In / Register'}
              </button>
            ) : (
              <button
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 text-center text-xs font-medium bg-rose-700/80 hover:bg-rose-700 rounded-lg text-white"
              >
                {currentLang === 'hi' ? 'लॉग आउट' : 'Sign Out'}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
