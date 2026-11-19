'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function CompareZohoContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('compare.zoho.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('compare.zoho.lead')}</p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-white/10 rounded-lg">
          <thead>
            <tr className="border-b border-white/10 text-zinc-300">
              <th className="text-left p-3">{t('compare.capability')}</th>
              <th className="text-left p-3">LORO</th>
              <th className="text-left p-3">Zoho CRM (+ RouteIQ)</th>
            </tr>
          </thead>
          <tbody className="text-zinc-400">
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.zoho.visitProof')}</td>
              <td className="p-3">{t('compare.zoho.loroVisit')}</td>
              <td className="p-3">{t('compare.zoho.zohoVisit')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.zoho.routePlanning')}</td>
              <td className="p-3">{t('compare.zoho.loroRoutes')}</td>
              <td className="p-3">{t('compare.zoho.zohoRoutes')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.zoho.competitorMapping')}</td>
              <td className="p-3">{t('compare.zoho.loroCompetitor')}</td>
              <td className="p-3">{t('compare.zoho.zohoCompetitor')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.zoho.erp')}</td>
              <td className="p-3">{t('platform.erp')}</td>
              <td className="p-3">{t('compare.zoho.zohoErp')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.zoho.platform')}</td>
              <td className="p-3">{t('platform.saas')}</td>
              <td className="p-3">{t('compare.zoho.zohoPlatform')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.zoho.ecosystem')}</td>
              <td className="p-3">{t('compare.zoho.loroEcosystem')}</td>
              <td className="p-3">{t('compare.zoho.zohoEcosystem')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-zinc-500 text-sm">{t('compare.zoho.footnote')}</p>
      <MarketingCta />
    </>
  );
}
