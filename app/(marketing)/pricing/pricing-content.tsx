'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function PricingContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('pricing.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-8">{t('pricing.lead')}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
          <h2 className="text-xl text-white font-medium mb-2">
            {t('pricing.growing.title')}
          </h2>
          <p className="text-zinc-400 text-sm mb-4">{t('pricing.growing.body')}</p>
          <ul className="text-sm text-zinc-300 space-y-2 list-disc list-inside">
            <li>{t('pricing.growing.perUser')}</li>
            <li>{t('pricing.growing.branchRoles')}</li>
            <li>{t('pricing.growing.support')}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-purple-500/30 bg-zinc-900/60 p-6">
          <h2 className="text-xl text-white font-medium mb-2">
            {t('pricing.enterprise.title')}
          </h2>
          <p className="text-zinc-400 text-sm mb-4">{t('pricing.enterprise.body')}</p>
          <ul className="text-sm text-zinc-300 space-y-2 list-disc list-inside">
            <li>{t('pricing.enterprise.onboarding')}</li>
            <li>{t('pricing.enterprise.erpReview')}</li>
            <li>{t('pricing.enterprise.targets')}</li>
          </ul>
        </div>
      </div>
      <p className="text-zinc-500 text-sm mt-8">{t('pricing.footnote')}</p>
      <MarketingCta />
    </>
  );
}
