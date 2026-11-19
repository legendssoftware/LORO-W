'use client';

import { useTranslation } from 'react-i18next';
import { formatWithLocale } from '@/lib/i18n/date-locale';

export function useFormatDate() {
  const { i18n } = useTranslation();
  return (date: Date | number, pattern: string) =>
    formatWithLocale(date, pattern, i18n.resolvedLanguage ?? i18n.language);
}
