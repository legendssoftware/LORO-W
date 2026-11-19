'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function PipelineContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('solutions.pipeline.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('solutions.pipeline.lead')}</p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>{t('solutions.pipeline.slides')}</p>
        <p>
          {t('solutions.pipeline.prefix')}{' '}
          <a href="/solutions/field-sales" className="text-purple-400 underline">
            {t('solutions.pipeline.fieldSales')}
          </a>
          {t('solutions.pipeline.suffix')}
        </p>
      </div>
      <MarketingCta />
    </>
  );
}
