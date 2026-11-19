'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function IntegrationsContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('integrations.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-8">{t('integrations.lead')}</p>
      <ul className="space-y-4">
        <li>
          <Link
            href="/integrations/sage"
            className="block rounded-xl border border-white/10 p-5 hover:border-purple-500/40 transition-colors"
          >
            <span className="text-white font-medium">Sage</span>
            <p className="text-sm text-zinc-400 mt-1">{t('integrations.sageBlurb')}</p>
          </Link>
        </li>
        <li>
          <Link
            href="/integrations/acumatica"
            className="block rounded-xl border border-white/10 p-5 hover:border-purple-500/40 transition-colors"
          >
            <span className="text-white font-medium">Acumatica</span>
            <p className="text-sm text-zinc-400 mt-1">
              {t('integrations.acumaticaBlurb')}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/integrations/sap"
            className="block rounded-xl border border-white/10 p-5 hover:border-purple-500/40 transition-colors"
          >
            <span className="text-white font-medium">SAP</span>
            <p className="text-sm text-zinc-400 mt-1">{t('integrations.sapBlurb')}</p>
          </Link>
        </li>
      </ul>
      <MarketingCta />
    </>
  );
}
