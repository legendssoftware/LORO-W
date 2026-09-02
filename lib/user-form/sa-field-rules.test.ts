import { describe, expect, it } from 'vitest';
import {
  isSouthAfrica,
  isValidBankAccountNo,
  isValidBankBranchCode,
  isValidGenericBankAccount,
  isValidGenericId,
  isValidNationalId,
  isValidPassport,
  isValidPhone,
  isValidSaId,
  saIdChecksumDigit,
} from './sa-field-rules';

describe('isValidPhone', () => {
  it('accepts SA, regional, and local-format numbers', () => {
    expect(isValidPhone('+27641234567')).toBe(true);
    expect(isValidPhone('064 123 4567')).toBe(true);
    expect(isValidPhone('+26771111111')).toBe(true);
    expect(isValidPhone('07123 456789')).toBe(true);
    expect(isValidPhone('(011) 123-4567')).toBe(true);
  });

  it('rejects short or letter values', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('not-a-phone')).toBe(false);
  });
});

describe('isValidSaId', () => {
  it('accepts a 13-digit number with a valid checksum', () => {
    const firstTwelve = '900115580008';
    const id = `${firstTwelve}${saIdChecksumDigit(firstTwelve)}`;
    expect(isValidSaId(id)).toBe(true);
  });

  it('rejects short or checksum-invalid IDs', () => {
    expect(isValidSaId('328219412')).toBe(false);
    expect(isValidSaId('9001155800080')).toBe(false);
  });
});

describe('isValidNationalId', () => {
  it('applies SA checksum rules for South Africa', () => {
    const firstTwelve = '900115580008';
    const id = `${firstTwelve}${saIdChecksumDigit(firstTwelve)}`;
    expect(isValidNationalId(id, 'South Africa')).toBe(true);
    expect(isValidNationalId('328219412', 'South Africa')).toBe(false);
  });

  it('accepts generic IDs for other countries', () => {
    expect(isValidNationalId('63-123456-A-78', 'Zimbabwe')).toBe(true);
    expect(isValidNationalId('AB123456C', 'United Kingdom')).toBe(true);
    expect(isValidNationalId('328219412', 'Namibia')).toBe(true);
  });
});

describe('isValidPassport', () => {
  it('accepts alphanumeric passport numbers', () => {
    expect(isValidPassport('BN2203945')).toBe(true);
    expect(isValidPassport('A12345678')).toBe(true);
  });

  it('rejects values that are too short', () => {
    expect(isValidPassport('AB12')).toBe(false);
  });
});

describe('isSouthAfrica', () => {
  it('recognises common South Africa labels', () => {
    expect(isSouthAfrica('South Africa')).toBe(true);
    expect(isSouthAfrica('ZA')).toBe(true);
    expect(isSouthAfrica('Namibia')).toBe(false);
  });
});

describe('bank fields', () => {
  it('accepts 7–11 digit accounts and 6-digit branch codes for SA', () => {
    expect(isValidBankAccountNo('6319848837')).toBe(true);
    expect(isValidBankBranchCode('250655')).toBe(true);
  });

  it('accepts generic bank accounts for non-SA countries', () => {
    expect(isValidGenericBankAccount('GB29NWBK601613')).toBe(true);
  });

  it('rejects malformed bank values', () => {
    expect(isValidBankAccountNo('12')).toBe(false);
    expect(isValidBankBranchCode('123')).toBe(false);
    expect(isValidGenericBankAccount('ab')).toBe(false);
  });
});

describe('isValidGenericId', () => {
  it('accepts alphanumeric IDs with hyphens', () => {
    expect(isValidGenericId('63-123456-A-78')).toBe(true);
  });

  it('rejects IDs that are too short', () => {
    expect(isValidGenericId('AB1')).toBe(false);
  });
});
