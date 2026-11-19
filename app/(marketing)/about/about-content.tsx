'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function AboutContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('about.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('about.lead')}</p>
      <div className="space-y-4 text-zinc-300">
        <p>{t('about.replaceSpreadsheets')}</p>
        <p>
          {t('about.connectsPrefix')}{' '}
          <a href="/solutions/visit-tracking" className="text-purple-400 underline">
            {t('about.visitTracking')}
          </a>{' '}
          {t('about.connectsMiddle')}{' '}
          <a
            href="/solutions/competitor-intelligence"
            className="text-purple-400 underline"
          >
            {t('about.competitorMapping')}
          </a>
          {t('about.connectsSuffix')}
        </p>
        <p>{t('about.workforce')}</p>
      </div>
      <MarketingCta />
    </>
  );
}
