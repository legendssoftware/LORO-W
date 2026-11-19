'use client';

import { useTranslation } from 'react-i18next';

export function BlogIndexHeading() {
  const { t } = useTranslation('marketing');

  return (
    <>
      <h1 className="font-body text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        {t('blog.titleLead')}
        <span className="font-serif italic">{t('blog.titleEmphasis')}</span>
      </h1>
      <p className="font-body text-zinc-400 text-lg mb-10">{t('blog.subtitle')}</p>
    </>
  );
}
