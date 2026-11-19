'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

/** FAQ item ids — order matches HOME_FAQS (JSON-LD stays English in lib/seo/home-faqs.ts). */
const FAQ_IDS = [
  'whatIs',
  'whoFor',
  'offline',
  'erp',
  'difference',
  'enterprise',
  'modules',
  'getStarted',
] as const;

export function LandingFaqSection() {
  const { t } = useTranslation('marketing');

  return (
    <section
      id="faq"
      className="relative w-full py-16 md:py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black"
      aria-labelledby="landing-faq-heading"
    >
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <h2
          id="landing-faq-heading"
          className="font-body text-2xl font-normal tracking-tight text-white sm:text-3xl mb-3 text-center"
        >
          {t('landing.faq.title')}{' '}
          <span className="font-serif italic">{t('landing.faq.titleItalic')}</span>
        </h2>
        <p className="font-body text-sm text-zinc-400 text-center mb-10">
          {t('landing.faq.lead')}
        </p>
        <dl className="space-y-6">
          {FAQ_IDS.map((id) => (
            <div
              key={id}
              className="rounded-xl border border-white/10 bg-zinc-900/30 px-5 py-4"
            >
              <dt className="font-body text-base font-medium text-white mb-2">
                {t(`landing.faq.items.${id}.question`)}
              </dt>
              <dd className="font-body text-sm text-zinc-400 leading-relaxed">
                {t(`landing.faq.items.${id}.answer`)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-center mt-8 text-sm text-zinc-500">
          <Link href="/blog" className="text-purple-400 hover:text-purple-300 underline">
            {t('landing.faq.blogLink')}
          </Link>{' '}
          {t('landing.faq.or')}{' '}
          <Link href="/compare/skynamo" className="text-purple-400 hover:text-purple-300 underline">
            {t('landing.faq.compareLink')}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
