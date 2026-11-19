import type { UiLocale } from './resolve-locale';

export const LOCALE_COOKIE = 'loro-locale';
export const LANGUAGE_PREFERENCE_KEY = 'loro-language-preference';

export function writeLocaleCookie(locale: UiLocale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
