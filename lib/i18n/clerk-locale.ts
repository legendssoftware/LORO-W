import { enUS, esES, frFR, ptPT } from '@clerk/localizations';
import { asUiLocale } from './date-locale';
import type { UiLocale } from './resolve-locale';

export function clerkLocalization(locale: string) {
  const code: UiLocale = asUiLocale(locale);
  switch (code) {
    case 'en':
      return enUS;
    case 'pt':
      return ptPT;
    case 'fr':
      return frFR;
    case 'es':
      return esES;
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}
