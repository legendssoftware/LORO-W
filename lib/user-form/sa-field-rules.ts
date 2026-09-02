const DIGITS_ONLY = /[^\d+]/g;

export const PHONE_VALIDATION_MESSAGE =
  'Enter a valid phone number with 8 to 15 digits, e.g. +27 82 123 4567 or 071 234 5678';

export function compactPhone(value: string): string {
  return value.replace(DIGITS_ONLY, '');
}

export function isSouthAfrica(country: string | null | undefined): boolean {
  const normalized = country?.trim().toLowerCase() ?? '';
  return normalized === 'south africa' || normalized === 'sa' || normalized === 'za';
}

/**
 * Accepts local and international numbers: 8–15 digits, optional formatting.
 */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return false;
  return !/[a-zA-Z]/.test(value);
}

/**
 * SA ID checksum (Luhn-style over the first 12 digits).
 */
export function saIdChecksumDigit(firstTwelveDigits: string): number {
  const digits = firstTwelveDigits.split('').map(Number);
  const oddSum =
    digits[0] + digits[2] + digits[4] + digits[6] + digits[8] + digits[10];
  const evenNumber = Number(
    `${digits[1]}${digits[3]}${digits[5]}${digits[7]}${digits[9]}${digits[11]}`,
  ) * 2;
  const evenSum = String(evenNumber)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  return (10 - ((oddSum + evenSum) % 10)) % 10;
}

export function isValidSaId(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return saIdChecksumDigit(digits.slice(0, 12)) === Number(digits[12]);
}

/** National / ID numbers for non-SA countries. */
export function isValidGenericId(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Za-z0-9\-]{4,20}$/.test(trimmed);
}

export function isValidPassport(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Za-z0-9]{5,15}$/.test(trimmed);
}

export function isValidNationalId(value: string, country: string | null | undefined): boolean {
  if (isSouthAfrica(country)) return isValidSaId(value);
  return isValidGenericId(value);
}

export function isValidBankAccountNo(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  return /^\d{7,11}$/.test(digits);
}

export function isValidBankBranchCode(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  return /^\d{6}$/.test(digits);
}

/** Bank account numbers for non-SA countries. */
export function isValidGenericBankAccount(value: string): boolean {
  const trimmed = value.replace(/\s/g, '');
  return /^[A-Za-z0-9\-]{4,20}$/.test(trimmed);
}

export function optionalFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
