export interface TeamMemberSocial {
  platform: 'instagram' | 'linkedin' | 'github';
  url: string;
  label: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  roleKey: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  socials: TeamMemberSocial[];
}

export interface CompanySocial {
  platform: 'youtube' | 'instagram';
  url: string;
  label: string;
}

export const COMPANY_INFO = {
  name: 'ERAZONE PRIVATE LIMITED',
  supportingTextEn:
    'Developed as part of the Erazone initiative, SakhiBiz brings its existing digital learning and business-support experience together in one platform.',
  supportingTextHi:
    'Erazone पहल के एक भाग के रूप में विकसित, सखीबिज अपने डिजिटल शिक्षा और व्यावसायिक सहायता अनुभवों को एक ही मंच पर एकीकृत करता है।',
  socials: [
    {
      platform: 'youtube',
      url: 'https://www.youtube.com/@ERAZONE-GENZ',
      label: 'Erazone YouTube Channel',
    },
    {
      platform: 'instagram',
      url: 'https://www.instagram.com/erazone__official',
      label: 'Erazone Official Instagram',
    },
  ] as CompanySocial[],
};

export const SUPPORT_INFO = {
  email: 'support@sakhibiz.xyz',
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'nitesh-chaurasiya',
    name: 'Nitesh Chaurasiya',
    role: 'Developer',
    roleKey: 'role_developer',
    initials: 'NC',
    avatarBg: 'bg-emerald-900',
    avatarText: 'text-emerald-100',
    socials: [
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/tech_by_niteshh',
        label: "Nitesh Chaurasiya's Instagram Profile",
      },
      {
        platform: 'linkedin',
        url: 'https://www.linkedin.com/in/nitesh-chaurasiya-a7b2aa3a5/',
        label: "Nitesh Chaurasiya's LinkedIn Profile",
      },
      {
        platform: 'github',
        url: 'https://github.com/tech-by-niteshh',
        label: "Nitesh Chaurasiya's GitHub Profile",
      },
    ],
  },
  {
    id: 'kajal-jain',
    name: 'Kajal Jain',
    role: 'Moderator',
    roleKey: 'role_moderator',
    initials: 'KJ',
    avatarBg: 'bg-[#E07A5F]',
    avatarText: 'text-white',
    socials: [
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/Jain_kajal_1215',
        label: "Kajal Jain's Instagram Profile",
      },
      {
        platform: 'linkedin',
        url: 'https://www.linkedin.com/in/kajal-jain-504b20420?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        label: "Kajal Jain's LinkedIn Profile",
      },
    ],
  },
  {
    id: 'rahul-gautam',
    name: 'Rahul Gautam',
    role: 'Manager',
    roleKey: 'role_manager',
    initials: 'RG',
    avatarBg: 'bg-teal-800',
    avatarText: 'text-teal-100',
    socials: [
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/rahu_lgautam45/',
        label: "Rahul Gautam's Instagram Profile",
      },
    ],
  },
  {
    id: 'anurag-pachauri',
    name: 'Anurag Pachauri',
    role: 'Researcher',
    roleKey: 'role_researcher',
    initials: 'AP',
    avatarBg: 'bg-amber-800',
    avatarText: 'text-amber-100',
    socials: [
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/i_m__nda_aspirants',
        label: "Anurag Pachauri's Instagram Profile",
      },
      // Note: LinkedIn omitted per specifications until official individual profile is confirmed
    ],
  },
  {
    id: 'raghav-upadhyay',
    name: 'Raghav Upadhyay',
    role: 'Team Lead',
    roleKey: 'role_team_lead',
    initials: 'RU',
    avatarBg: 'bg-[#18392B]',
    avatarText: 'text-[#F4F1DE]',
    socials: [
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/__raghavx__07/',
        label: "Raghav Upadhyay's Instagram Profile",
      },
      {
        platform: 'linkedin',
        url: 'https://www.linkedin.com/in/raghav-upadhyay-8456753aa/',
        label: "Raghav Upadhyay's LinkedIn Profile",
      },
    ],
  },
];
