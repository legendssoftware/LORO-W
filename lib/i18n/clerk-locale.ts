import { enUS, esES, frFR, itIT, ptPT } from '@clerk/localizations';
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
    case 'it':
      return itIT;
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}
