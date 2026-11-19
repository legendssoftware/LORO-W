import { describe, expect, it } from 'vitest';
import { resolveUiLocale } from './resolve-locale';

describe('resolveUiLocale', () => {
  it('keeps an explicit supported language', () => {
    expect(resolveUiLocale('fr', [{ languageTag: 'pt-MZ' }])).toBe('fr');
    expect(resolveUiLocale(' ES ', [{ languageTag: 'en-ZA' }])).toBe('es');
  });

  it('uses the device language before the country', () => {
    expect(resolveUiLocale('auto', [{ languageTag: 'fr-CA' }])).toBe('fr');
    expect(resolveUiLocale('auto', [{ languageTag: 'pt-BR' }])).toBe('pt');
    expect(resolveUiLocale(undefined, [{ languageCode: 'es', regionCode: 'US' }])).toBe('es');
  });

  it('maps the country when the device language is not supported', () => {
    expect(resolveUiLocale('auto', [{ languageTag: 'de-FR' }])).toBe('fr');
    expect(resolveUiLocale('zu', [{ languageCode: 'zu', regionCode: 'MZ' }])).toBe('pt');
    expect(resolveUiLocale('af', [{ languageTag: 'af-ZA' }])).toBe('en');
  });

  it('falls back to English', () => {
    expect(resolveUiLocale('auto', [])).toBe('en');
    expect(resolveUiLocale(null, [{ languageTag: 'en-ZA' }])).toBe('en');
    expect(resolveUiLocale('auto', [{ languageTag: 'de-DE' }, { languageTag: 'en-GB' }])).toBe('en');
  });

  it('walks device locales in order', () => {
    expect(
      resolveUiLocale('auto', [{ languageTag: 'de-DE' }, { languageTag: 'es-MX' }]),
    ).toBe('es');
  });
});
