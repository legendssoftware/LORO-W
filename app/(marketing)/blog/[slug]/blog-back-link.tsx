'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function BlogBackLink() {
  const { t } = useTranslation('marketing');

  return (
    <Link
      href="/blog"
      className="font-body text-sm text-purple-400 hover:text-purple-300 mb-6 inline-block"
    >
      {t('blog.back')}
    </Link>
  );
}
