import React from 'react';
import {
  Building2,
  Users,
  Mail,
  ArrowRight,
  BookOpen,
  Calculator,
  Sparkles,
  Instagram,
  Linkedin,
  Github,
  Youtube,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Language } from '../types';
import { getText } from '../utils/translations';
import { COMPANY_INFO, SUPPORT_INFO, TEAM_MEMBERS, TeamMemberSocial, CompanySocial } from '../data/about';

interface AboutPageProps {
  currentLang: Language;
  onNavigate: (tab: string, courseId?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ currentLang, onNavigate }) => {
  const getSocialIcon = (platform: TeamMemberSocial['platform']) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-5 h-5" aria-hidden="true" />;
      case 'linkedin':
        return <Linkedin className="w-5 h-5" aria-hidden="true" />;
      case 'github':
        return <Github className="w-5 h-5" aria-hidden="true" />;
    }
  };

  const getCompanySocialIcon = (platform: CompanySocial['platform']) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-600" aria-hidden="true" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-600" aria-hidden="true" />;
    }
  };

  return (
    <main className="min-h-screen bg-[#FBF9F5] text-[#242A27]">
      {/* HERO SECTION */}
      <section
        aria-labelledby="about-hero-heading"
        className="relative overflow-hidden bg-gradient-to-b from-[#18392B] via-[#153326] to-[#122A20] text-white pt-14 pb-20 sm:pt-20 sm:pb-28"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#E07A5F_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-[#E07A5F] text-xs sm:text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-[#E07A5F]" aria-hidden="true" />
            <span>SakhiBiz • Erazone Initiative</span>
          </div>

          {/* Heading */}
          <h1
            id="about-hero-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 font-serif"
          >
            {getText('aboutHeroHeading', currentLang)}
          </h1>

          {/* Intro Description */}
          <p className="text-base sm:text-lg md:text-xl text-[#E8EFEA] max-w-3xl mx-auto leading-relaxed font-normal mb-10">
            {getText('aboutHeroIntro', currentLang)}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              id="about-hero-cta-courses"
              onClick={() => onNavigate('courses')}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#E07A5F] hover:bg-[#D46B50] text-white font-semibold text-sm sm:text-base shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#18392B]"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>{getText('aboutHeroCtaCourses', currentLang)}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              id="about-hero-cta-tools"
              onClick={() => onNavigate('tools')}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm sm:text-base backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#18392B]"
            >
              <Calculator className="w-4 h-4" aria-hidden="true" />
              <span>{getText('aboutHeroCtaTools', currentLang)}</span>
            </button>
          </div>
        </div>
      </section>

      {/* COMPANY SECTION (PROMINENT BRANDING) */}
      <section
        aria-labelledby="company-branding-heading"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-20"
      >
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E5E0D8] shadow-lg shadow-black/5">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFEA] text-[#18392B] text-xs font-semibold uppercase tracking-wider mb-3">
              <Building2 className="w-3.5 h-3.5 text-[#18392B]" aria-hidden="true" />
              <span>{getText('aboutCompanyEyebrow', currentLang)}</span>
            </div>

            <h2
              id="company-branding-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#18392B] tracking-tight mb-4"
            >
              {COMPANY_INFO.name}
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-[#4A5568] leading-relaxed mb-8">
              {getText('aboutCompanyText', currentLang)}
            </p>

            {/* Official Social Links */}
            <div className="border-t border-[#F0ECE1] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs sm:text-sm font-medium text-[#6C757D]">
                {getText('aboutCompanySocialsHeading', currentLang)}
              </span>
              <div className="flex items-center gap-3">
                {COMPANY_INFO.socials.map((social) => (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E0D8] bg-[#FBF9F5] hover:bg-white text-[#242A27] hover:text-[#18392B] hover:border-[#18392B]/30 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2"
                  >
                    {getCompanySocialIcon(social.platform)}
                    <span className="capitalize">{social.platform}</span>
                    <ExternalLink className="w-3 h-3 text-[#6C757D]" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR TEAM SECTION */}
      <section
        aria-labelledby="team-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      >
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFEA] text-[#18392B] text-xs font-semibold uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5 text-[#18392B]" aria-hidden="true" />
            <span>SakhiBiz Contributors</span>
          </div>
          <h2
            id="team-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#18392B] tracking-tight mb-3 font-serif"
          >
            {getText('aboutTeamHeading', currentLang)}
          </h2>
          <p className="text-sm sm:text-base text-[#6C757D] leading-relaxed">
            {getText('aboutTeamSubtitle', currentLang)}
          </p>
        </div>

        {/* 5 Profile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-[#E5E0D8] shadow-sm hover:shadow-md transition-all duration-300 p-6 sm:p-7 flex flex-col items-center text-center group motion-reduce:transition-none"
            >
              {/* Initials Avatar */}
              <div
                className={`w-20 h-20 rounded-2xl ${member.avatarBg} ${member.avatarText} flex items-center justify-center text-xl font-bold tracking-wider mb-5 shadow-inner border border-black/5 group-hover:scale-105 transition-transform duration-300 motion-reduce:transform-none`}
                aria-hidden="true"
              >
                {member.initials}
              </div>

              {/* Name */}
              <h3 className="text-lg sm:text-xl font-bold text-[#18392B] tracking-tight mb-1">
                {member.name}
              </h3>

              {/* Role */}
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#E07A5F] mb-6">
                {getText(member.roleKey, currentLang) || member.role}
              </p>

              {/* Social Links */}
              <div className="mt-auto pt-4 border-t border-[#F0ECE1] w-full flex items-center justify-center gap-2">
                {member.socials.length > 0 ? (
                  member.socials.map((social) => (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      title={social.label}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#5A6B63] hover:text-[#18392B] hover:bg-[#F3F6F4] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2"
                    >
                      {getSocialIcon(social.platform)}
                    </a>
                  ))
                ) : (
                  <span className="text-xs text-[#9CA3AF] py-2">
                    Verified contributor
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUPPORT & CONTACT SECTION */}
      <section
        aria-labelledby="support-heading"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28"
      >
        <div className="bg-gradient-to-br from-[#18392B] to-[#122A20] text-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xl shadow-emerald-950/10">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-[#E07A5F]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-7 h-7 text-[#E07A5F]" aria-hidden="true" />
            </div>

            <h2
              id="support-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 font-serif"
            >
              {getText('aboutSupportHeading', currentLang)}
            </h2>

            <p className="text-sm sm:text-base text-[#D5DDD8] leading-relaxed mb-8">
              {getText('aboutSupportSubtitle', currentLang)}
            </p>

            {/* Official Support Email Container */}
            <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/5 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-sm mb-6">
              <div className="text-left sm:pr-4 sm:border-r sm:border-white/15">
                <p className="text-xs text-[#A5B8AD] uppercase tracking-wider font-semibold">
                  {getText('aboutSupportEmailLabel', currentLang)}
                </p>
                <a
                  href={`mailto:${SUPPORT_INFO.email}`}
                  id="about-support-email-link"
                  className="text-base sm:text-lg font-bold text-white hover:text-[#E07A5F] underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                >
                  {SUPPORT_INFO.email}
                </a>
              </div>

              <a
                href={`mailto:${SUPPORT_INFO.email}`}
                id="about-support-email-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E07A5F] hover:bg-[#D46B50] text-white text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>{getText('aboutSupportButton', currentLang)}</span>
              </a>
            </div>

            <p className="text-xs text-[#8DA399] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Direct official channel • All queries handled securely</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
