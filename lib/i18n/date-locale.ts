import { format } from 'date-fns';
import { enGB, es, fr, pt } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { isUiLocale, type UiLocale } from './resolve-locale';

export function asUiLocale(value: string | null | undefined): UiLocale {
  return isUiLocale(value) ? value : 'en';
}

export function dateFnsLocale(locale: UiLocale): Locale {
  switch (locale) {
    case 'en':
      return enGB;
    case 'pt':
      return pt;
    case 'fr':
      return fr;
    case 'es':
      return es;
    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
}

export function formatWithLocale(date: Date | number, pattern: string, locale: string): string {
  return format(date, pattern, { locale: dateFnsLocale(asUiLocale(locale)) });
}
