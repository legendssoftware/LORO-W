'use client';

import { useTranslation } from 'react-i18next';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export function CompareRepslyContent() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('compare.repsly.title')}
      </h1>
      <p className="text-zinc-400 text-lg mb-6">{t('compare.repsly.lead')}</p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-white/10 rounded-lg">
          <thead>
            <tr className="border-b border-white/10 text-zinc-300">
              <th className="text-left p-3">{t('compare.topic')}</th>
              <th className="text-left p-3">LORO</th>
              <th className="text-left p-3">Repsly</th>
            </tr>
          </thead>
          <tbody className="text-zinc-400">
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.repsly.focus')}</td>
              <td className="p-3">{t('compare.repsly.loroFocus')}</td>
              <td className="p-3">{t('compare.repsly.repslyFocus')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.repsly.region')}</td>
              <td className="p-3">{t('compare.repsly.loroRegion')}</td>
              <td className="p-3">{t('compare.repsly.repslyRegion')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.repsly.differentiator')}</td>
              <td className="p-3">{t('compare.repsly.loroDiff')}</td>
              <td className="p-3">{t('compare.repsly.repslyDiff')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.repsly.erp')}</td>
              <td className="p-3">{t('platform.erp')}</td>
              <td className="p-3">{t('compare.repsly.repslyErp')}</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">{t('compare.repsly.platform')}</td>
              <td className="p-3">{t('platform.saas')}</td>
              <td className="p-3">{t('compare.repsly.repslyPlatform')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-zinc-500 text-sm">{t('compare.repsly.footnote')}</p>
      <MarketingCta />
    </>
  );
}
