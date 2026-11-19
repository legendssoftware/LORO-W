'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function CompareSkynamoContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('compare.skynamo.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('compare.skynamo.lead')}</p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-white/10 rounded-lg">
          <thead>
            <tr className="border-b border-white/10 text-zinc-300">
              <th className="text-left p-3">{t('compare.topic')}</th>
              <th className="text-left p-3">LORO</th>
              <th className="text-left p-3">Skynamo</th>
            </tr>
          </thead>
          <tbody className="text-zinc-400">
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.skynamo.positioning')}</td>
              <td className="p-3">{t('compare.skynamo.loroPosition')}</td>
              <td className="p-3">{t('compare.skynamo.skynamoPosition')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.skynamo.erp')}</td>
              <td className="p-3">{t('platform.erp')}</td>
              <td className="p-3">{t('compare.skynamo.skynamoErp')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.skynamo.platform')}</td>
              <td className="p-3">{t('platform.saas')}</td>
              <td className="p-3">{t('compare.skynamo.skynamoPlatform')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.skynamo.bestFor')}</td>
              <td className="p-3">{t('compare.skynamo.loroBest')}</td>
              <td className="p-3">{t('compare.skynamo.skynamoBest')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-zinc-500 text-sm">{t('compare.skynamo.footnote')}</p>
      <MarketingCta />
    </>
  );
}
