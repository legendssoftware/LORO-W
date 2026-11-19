'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function SageContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('integrations.sage.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('integrations.sage.lead')}</p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>{t('integrations.sage.finance')}</p>
        <p>
          {t('integrations.sage.hubPrefix')}{' '}
          <a href="/integrations" className="text-purple-400 underline">
            {t('integrations.sage.hubLink')}
          </a>
          {t('integrations.sage.hubSuffix')}
        </p>
      </div>
      <MarketingCta />
    </>
  );
}
