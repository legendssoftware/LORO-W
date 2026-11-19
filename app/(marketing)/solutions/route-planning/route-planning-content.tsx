'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function RoutePlanningContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('solutions.routes.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('solutions.routes.lead')}</p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>{t('solutions.routes.driving')}</p>
        <p>
          {t('solutions.routes.prefix')}{' '}
          <a href="/solutions/visit-tracking" className="text-purple-400 underline">
            {t('solutions.routes.visitTracking')}
          </a>
          {t('solutions.routes.suffix')}
        </p>
      </div>
      <MarketingCta />
    </>
  );
}
