'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function FieldSalesContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('solutions.fieldSales.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-8">{t('solutions.fieldSales.lead')}</p>
      <div className="space-y-6 text-zinc-300">
        <section>
          <h2 className="text-xl text-white font-medium mb-2">
            {t('solutions.fieldSales.repsTitle')}
          </h2>
          <p className="text-sm text-zinc-400">{t('solutions.fieldSales.repsBody')}</p>
        </section>
        <section>
          <h2 className="text-xl text-white font-medium mb-2">
            {t('solutions.fieldSales.managersTitle')}
          </h2>
          <p className="text-sm text-zinc-400">
            {t('solutions.fieldSales.managersBody')}
          </p>
        </section>
        <section>
          <h2 className="text-xl text-white font-medium mb-2">
            {t('solutions.fieldSales.modulesTitle')}
          </h2>
          <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
            <li>
              <a href="/solutions/visit-tracking" className="text-purple-400 underline">
                {t('solutions.fieldSales.visitTracking')}
              </a>
            </li>
            <li>
              <a href="/solutions/route-planning" className="text-purple-400 underline">
                {t('solutions.fieldSales.routePlanning')}
              </a>
            </li>
            <li>
              <a href="/solutions/pipeline" className="text-purple-400 underline">
                {t('solutions.fieldSales.pipeline')}
              </a>
            </li>
            <li>
              <a href="/integrations" className="text-purple-400 underline">
                {t('solutions.fieldSales.erp')}
              </a>
            </li>
          </ul>
        </section>
      </div>
      <MarketingCta />
    </>
  );
}
