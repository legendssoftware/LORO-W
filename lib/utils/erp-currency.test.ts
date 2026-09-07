import { describe, expect, it } from 'vitest';
import { getForexCodeForZarConversion, getCurrencyForCountry } from './erp-currency';

describe('erp-currency', () => {
  it('converts ZW and ZWI with USD forex, not ZWL', () => {
    expect(getForexCodeForZarConversion('ZW')).toBe('USD');
    expect(getForexCodeForZarConversion('ZWI')).toBe('USD');
    expect(getCurrencyForCountry('ZWI').code).toBe('ZWL');
  });
});
