/**
 * Static copy for year-end performance bonus requirements notice (dashboard welcome).
 */

export const NOTICE_TITLE = 'IMPORTANT NOTICE';

export const NOTICE_SUBTITLE = 'YEAR-END PERFORMANCE BONUS REQUIREMENTS';

export const NOTICE_EFFECTIVE_DATE = 'Effective Date: 01 June 2026';

export const NOTICE_GREETING = 'Dear Team,';

export const NOTICE_INTRO_PARAGRAPHS = [
  'Please note that the Year-End Performance Bonus is based on minimum performance, attendance, punctuality, and compliance requirements throughout the year.',
  'The numbers below are NOT targets or stretch goals. These are the MINIMUM daily requirements expected from your position.',
  'To remain eligible for the Year-End Performance Bonus, all employees must maintain a minimum average performance of 90% or higher during the year.',
  'Employees finishing the year below 90% average performance will automatically be disqualified from the Year-End Performance Bonus.',
] as const;

export const NOTICE_EMPHASIS_INTRO = 'Please note:';

export const NOTICE_EMPHASIS_BULLETS = [
  '90% is the minimum acceptable level.',
  '89%, 88%, 80%, or any percentage below 90% does NOT qualify.',
] as const;

export const MINIMUM_DAILY_REQUIREMENTS_HEADING = 'MINIMUM DAILY REQUIREMENTS';

export const MINIMUM_DAILY_REQUIREMENTS_TABLE = {
  headers: ['Position', 'Calls Required Per Day', 'Visits Required Per Day'] as const,
  rows: [
    ['Internal Sales Representatives', '60 Calls', 'N/A'],
    ['External Sales Representatives', '20 Calls', '8 Visits'],
    ['Branch Team Leaders', '60 Calls', 'N/A'],
    ['Branch Managers (with Assistant)', '20 Calls', '8 Visits'],
    ['Country Managers', '20 Calls', '8 Visits'],
  ] as const,
};

export type NoticeSection = {
  title: string;
  intro?: string;
  bullets?: readonly string[];
  paragraphs?: readonly string[];
};

export const NOTICE_SECTIONS: readonly NoticeSection[] = [
  {
    title: 'BONUS DISQUALIFICATION RULES',
    intro: 'Employees will automatically be disqualified from the Year-End Performance Bonus if:',
    bullets: [
      'Their yearly average performance falls below 90%.',
      'They fail to meet the minimum required performance for 3 consecutive months.',
      'Attendance falls below 97% average for 3 months during the year.',
      'They have 3 or more late arrivals in a month for 3 consecutive months.',
      'Calls, visits, or activities are not properly logged into the CRM system.',
    ],
  },
  {
    title: 'PERFORMANCE RECOVERY',
    intro: 'Employees may recover their average performance during the year.',
    paragraphs: ['Example:'],
    bullets: [
      'One month at 85%',
      'Next month at 95%+',
      'This may recover the overall yearly average back to the minimum required 90%.',
      'However, failing to meet the minimum required level for 3 consecutive months will result in automatic bonus disqualification.',
    ],
  },
  {
    title: 'IMPORTANT',
    paragraphs: [
      'All calls, visits, customer interactions, and activities must be logged correctly in the CRM system.',
      'If it is not logged in the CRM, it will be considered as NOT DONE.',
      'Management may audit:',
    ],
    bullets: [
      'CRM activity',
      'Call records',
      'GPS movement',
      'Visit reports',
      'Attendance records',
      'Clock-in & clock-out records',
      'Customer feedback',
    ],
  },
];

export const NOTICE_CLOSING_PARAGRAPHS = [
  'Thank you for your commitment, discipline, and dedication.',
  'Management',
] as const;
