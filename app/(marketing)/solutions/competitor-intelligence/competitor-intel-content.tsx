'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function CompetitorIntelContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('solutions.competitor.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('solutions.competitor.lead')}</p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>{t('solutions.competitor.landscape')}</p>
        <p>{t('solutions.competitor.afterSignIn')}</p>
      </div>
      <MarketingCta />
    </>
  );
}
