'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function CustomersContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('customers.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-8">{t('customers.lead')}</p>
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 p-5">
          <h2 className="text-lg text-white font-medium mb-2">
            {t('customers.distributors.title')}
          </h2>
          <p className="text-zinc-400 text-sm">{t('customers.distributors.body')}</p>
        </div>
        <div className="rounded-xl border border-white/10 p-5">
          <h2 className="text-lg text-white font-medium mb-2">
            {t('customers.dashboard.title')}
          </h2>
          <p className="text-zinc-400 text-sm">{t('customers.dashboard.body')}</p>
        </div>
        <div className="rounded-xl border border-white/10 p-5">
          <h2 className="text-lg text-white font-medium mb-2">
            {t('customers.erp.title')}
          </h2>
          <p className="text-zinc-400 text-sm">{t('customers.erp.body')}</p>
        </div>
      </div>
      <p className="text-zinc-500 text-sm mt-8">{t('customers.footnote')}</p>
      <MarketingCta />
    </>
  );
}
