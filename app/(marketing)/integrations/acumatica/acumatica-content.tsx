'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function AcumaticaContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('integrations.acumatica.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('integrations.acumatica.lead')}</p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>{t('integrations.acumatica.proof')}</p>
        <p>{t('integrations.acumatica.execution')}</p>
      </div>
      <MarketingCta />
    </>
  );
}
