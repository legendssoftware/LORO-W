import {
  LORO_ERP_FAQ_ANSWER,
  LORO_VS_SKYNAMO_POSITION,
} from './marketing-platform-copy';

export type HomeFaq = {
  question: string;
  answer: string;
};

/** FAQs for homepage UI and FAQPage JSON-LD. */
export const HOME_FAQS: HomeFaq[] = [
  {
    question: 'What is LORO field sales software?',
    answer:
      'LORO is a South African field sales platform for visits, route planning, pipeline management, client accounts, and ERP-linked orders—on web and mobile for reps and managers.',
  },
  {
    question: 'Who is LORO built for?',
    answer:
      'Manufacturers, wholesalers, distributors, and field teams that visit B2B customers regularly and need one system for visits, quotes, tasks, and performance reporting.',
  },
  {
    question: 'Does LORO work offline for field reps?',
    answer:
      'The LORO mobile app is built for reps on the road. Core field workflows are designed for unreliable connectivity; sign in when online to sync visits, orders, and pipeline updates.',
  },
  {
    question: 'Can LORO integrate with our ERP?',
    answer: LORO_ERP_FAQ_ANSWER,
  },
  {
    question: 'How is LORO different from Skynamo or Repsly?',
    answer: LORO_VS_SKYNAMO_POSITION,
  },
  {
    question: 'Is LORO only for large enterprises?',
    answer:
      'No. Teams from growing distributors to multi-branch operations use LORO. Start with sign-up or the Android app trial and scale users as your field program grows.',
  },
  {
    question: 'What modules are included?',
    answer:
      'Leads, pipeline, planning and routes, visits with evidence, client and competitor workspaces, map visualiser, reports, IoT branch hardware, and optional HR attendance—under one login.',
  },
  {
    question: 'How do we get started?',
    answer:
      'Create an account at sign-up, or download the Android app. Managers configure branches and targets; reps plan routes and log visits from day one.',
  },
];

export function buildFaqPageJsonLd(faqs: HomeFaq[], pageUrl: string) {
  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
