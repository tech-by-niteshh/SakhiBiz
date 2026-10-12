import assert from 'node:assert';
import { COMPANY_INFO, SUPPORT_INFO, TEAM_MEMBERS } from '../src/data/about';
import { getText, LOCALES } from '../src/utils/translations';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('SakhiBiz About Page & Team Profile Verification');
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

// Suite 1: Company Branding & Verification
console.log('--- Suite 1: Erazone Company Branding ---');

test('Company name is exactly "ERAZONE PRIVATE LIMITED"', () => {
  assert.strictEqual(COMPANY_INFO.name, 'ERAZONE PRIVATE LIMITED');
});

test('Company supporting text is present in English and Hindi', () => {
  assert(COMPANY_INFO.supportingTextEn.includes('Erazone initiative'));
  assert(COMPANY_INFO.supportingTextEn.includes('SakhiBiz'));
  assert(COMPANY_INFO.supportingTextHi.includes('Erazone'));
});

test('Company socials contain verified YouTube and Instagram links only', () => {
  assert.strictEqual(COMPANY_INFO.socials.length, 2);
  const yt = COMPANY_INFO.socials.find((s) => s.platform === 'youtube');
  const ig = COMPANY_INFO.socials.find((s) => s.platform === 'instagram');
  assert(yt, 'YouTube link missing');
  assert(ig, 'Instagram link missing');
  assert.strictEqual(yt.url, 'https://www.youtube.com/@ERAZONE-GENZ');
  assert.strictEqual(ig.url, 'https://www.instagram.com/erazone__official');

  // Unverified/broken 404 company LinkedIn URL must NOT be in company socials
  const li = COMPANY_INFO.socials.find((s: any) => s.platform === 'linkedin');
  assert.strictEqual(li, undefined, 'Unverified LinkedIn link must not be displayed');
});

// Suite 2: Official Support Information
console.log('\n--- Suite 2: Official Support Information ---');

test('Support email is official support@sakhibiz.xyz', () => {
  assert.strictEqual(SUPPORT_INFO.email, 'support@sakhibiz.xyz');
});

// Suite 3: Team Members & Profiles
console.log('\n--- Suite 3: Team Members & Role Labels ---');

test('Exactly 5 team members are registered with exact names and titles', () => {
  assert.strictEqual(TEAM_MEMBERS.length, 5);

  const expected = [
    { name: 'Nitesh Chaurasiya', role: 'Developer', roleKey: 'role_developer' },
    { name: 'Kajal Jain', role: 'Moderator', roleKey: 'role_moderator' },
    { name: 'Rahul Gautam', role: 'Manager', roleKey: 'role_manager' },
    { name: 'Anurag Pachauri', role: 'Researcher', roleKey: 'role_researcher' },
    { name: 'Raghav Upadhyay', role: 'Team Lead', roleKey: 'role_team_lead' },
  ];

  expected.forEach((exp, idx) => {
    const member = TEAM_MEMBERS[idx];
    assert.strictEqual(member.name, exp.name, `Member ${idx} name mismatch`);
    assert.strictEqual(member.role, exp.role, `Member ${idx} role mismatch`);
    assert.strictEqual(member.roleKey, exp.roleKey, `Member ${idx} roleKey mismatch`);
    assert(member.initials.length >= 2, `Member ${idx} missing initials`);
  });
});

test('Member 1 (Nitesh Chaurasiya) has Instagram, LinkedIn, and GitHub links', () => {
  const nitesh = TEAM_MEMBERS.find((m) => m.name === 'Nitesh Chaurasiya')!;
  assert.strictEqual(nitesh.socials.length, 3);
  const ig = nitesh.socials.find((s) => s.platform === 'instagram');
  const li = nitesh.socials.find((s) => s.platform === 'linkedin');
  const gh = nitesh.socials.find((s) => s.platform === 'github');
  assert.strictEqual(ig?.url, 'https://www.instagram.com/tech_by_niteshh');
  assert.strictEqual(li?.url, 'https://www.linkedin.com/in/nitesh-chaurasiya-a7b2aa3a5/');
  assert.strictEqual(gh?.url, 'https://github.com/tech-by-niteshh');
});

test('Member 2 (Kajal Jain) has Instagram and LinkedIn links', () => {
  const kajal = TEAM_MEMBERS.find((m) => m.name === 'Kajal Jain')!;
  assert.strictEqual(kajal.socials.length, 2);
  const ig = kajal.socials.find((s) => s.platform === 'instagram');
  const li = kajal.socials.find((s) => s.platform === 'linkedin');
  assert.strictEqual(ig?.url, 'https://www.instagram.com/Jain_kajal_1215');
  assert(li?.url.includes('kajal-jain-504b20420'));
});

test('Member 3 (Rahul Gautam) has Instagram link only', () => {
  const rahul = TEAM_MEMBERS.find((m) => m.name === 'Rahul Gautam')!;
  assert.strictEqual(rahul.socials.length, 1);
  assert.strictEqual(rahul.socials[0].platform, 'instagram');
  assert.strictEqual(rahul.socials[0].url, 'https://www.instagram.com/rahu_lgautam45/');
});

test('Member 4 (Anurag Pachauri) has Instagram only, NO generic LinkedIn homepage redirect', () => {
  const anurag = TEAM_MEMBERS.find((m) => m.name === 'Anurag Pachauri')!;
  assert.strictEqual(anurag.socials.length, 1);
  assert.strictEqual(anurag.socials[0].platform, 'instagram');
  assert.strictEqual(anurag.socials[0].url, 'https://www.instagram.com/i_m__nda_aspirants');

  const hasLi = anurag.socials.some((s) => s.platform === 'linkedin');
  assert.strictEqual(hasLi, false, 'Generic LinkedIn redirect must be excluded from Anurag Pachauri card');
});

test('Member 5 (Raghav Upadhyay) has Instagram and LinkedIn links', () => {
  const raghav = TEAM_MEMBERS.find((m) => m.name === 'Raghav Upadhyay')!;
  assert.strictEqual(raghav.socials.length, 2);
  const ig = raghav.socials.find((s) => s.platform === 'instagram');
  const li = raghav.socials.find((s) => s.platform === 'linkedin');
  assert.strictEqual(ig?.url, 'https://www.instagram.com/__raghavx__07/');
  assert.strictEqual(li?.url, 'https://www.linkedin.com/in/raghav-upadhyay-8456753aa/');
});

// Suite 4: Localization & Role Translations
console.log('\n--- Suite 4: Dual-Language (Hindi/English) Translations ---');

test('About page keys exist in both English and Hindi locales', () => {
  const keys = [
    'aboutHeroHeading',
    'aboutHeroIntro',
    'aboutHeroCtaCourses',
    'aboutHeroCtaTools',
    'aboutCompanyEyebrow',
    'aboutCompanyName',
    'aboutCompanyText',
    'aboutCompanySocialsHeading',
    'aboutTeamHeading',
    'aboutTeamSubtitle',
    'role_developer',
    'role_moderator',
    'role_manager',
    'role_researcher',
    'role_team_lead',
    'aboutSupportHeading',
    'aboutSupportSubtitle',
    'aboutSupportEmailLabel',
    'aboutSupportButton',
  ];

  keys.forEach((key) => {
    const enVal = getText(key, 'en');
    const hiVal = getText(key, 'hi');
    assert(enVal && enVal !== key, `Missing EN translation for ${key}`);
    assert(hiVal && hiVal !== key, `Missing HI translation for ${key}`);
  });
});

test('Role translations match expected Hindi designations', () => {
  assert.strictEqual(getText('role_developer', 'hi'), 'डेवलपर');
  assert.strictEqual(getText('role_moderator', 'hi'), 'मॉडरेटर');
  assert.strictEqual(getText('role_manager', 'hi'), 'मैनेजर');
  assert.strictEqual(getText('role_researcher', 'hi'), 'रिसर्चर');
  assert.strictEqual(getText('role_team_lead', 'hi'), 'टीम लीड');
});

// Suite 5: Navigation & Component Integration Verification
console.log('\n--- Suite 5: Navigation & Source Code Integrity ---');

test('Navbar includes About Us navigation item', () => {
  const navbarSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/Navbar.tsx'), 'utf-8');
  assert(navbarSrc.includes("id: 'about'"), 'Navbar must contain about tab');
  assert(navbarSrc.includes("getText('navAbout'"), 'Navbar must use navAbout translation key');
});

test('Footer includes About Us link and official support email', () => {
  const footerSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/Footer.tsx'), 'utf-8');
  assert(footerSrc.includes("onNavigate('about')"), 'Footer must contain onNavigate("about")');
  assert(footerSrc.includes('support@sakhibiz.xyz'), 'Footer must contain support@sakhibiz.xyz');
  assert(footerSrc.includes('mailto:support@sakhibiz.xyz'), 'Footer must contain clickable mailto link');
});

test('App.tsx maps /about route and renders AboutPage', () => {
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
  assert(appSrc.includes("clean === '/about'"), 'App.tsx must parse /about pathname');
  assert(appSrc.includes('<AboutPage'), 'App.tsx must render AboutPage');
  assert(appSrc.includes('About SakhiBiz | Erazone Private Limited'), 'App.tsx must set SEO title for about page');
});

test('AboutPage component contains secure link attributes (rel="noopener noreferrer")', () => {
  const aboutSrc = fs.readFileSync(path.join(process.cwd(), 'src/pages/AboutPage.tsx'), 'utf-8');
  assert(aboutSrc.includes('rel="noopener noreferrer"'), 'All external links must use rel="noopener noreferrer"');
  assert(aboutSrc.includes('aria-label='), 'Links must include accessible aria-label attributes');
  assert(aboutSrc.includes('mailto:'), 'Must include mailto link for support email');
});

console.log(`\n====================================================`);
console.log(`All ${passedCount} About page tests passed successfully!`);
console.log(`====================================================\n`);
