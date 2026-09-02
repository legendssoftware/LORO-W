import { describe, expect, it } from 'vitest';
import {
  isValidBankAccountNo,
  isValidBankBranchCode,
  isValidPhone,
  isValidSaId,
  saIdChecksumDigit,
} from './sa-field-rules';

describe('isValidPhone', () => {
  it('accepts SA mobile and E.164 numbers', () => {
    expect(isValidPhone('+27641234567')).toBe(true);
    expect(isValidPhone('064 123 4567')).toBe(true);
    expect(isValidPhone('+26771111111')).toBe(true);
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

describe('bank fields', () => {
  it('accepts 7–11 digit accounts and 6-digit branch codes', () => {
    expect(isValidBankAccountNo('6319848837')).toBe(true);
    expect(isValidBankBranchCode('250655')).toBe(true);
  });

  it('rejects malformed bank values', () => {
    expect(isValidBankAccountNo('12')).toBe(false);
    expect(isValidBankBranchCode('123')).toBe(false);
  });
});
