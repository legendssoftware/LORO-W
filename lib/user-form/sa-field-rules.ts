const DIGITS_ONLY = /[^\d+]/g;

export function compactPhone(value: string): string {
  return value.replace(DIGITS_ONLY, '');
}

/**
 * South African numbers (`+27…` / `0…`) plus other E.164 values.
 */
export function isValidPhone(value: string): boolean {
  const compact = compactPhone(value);
  if (/^\+27[1-9]\d{8}$/.test(compact)) return true;
  if (/^0[1-9]\d{8}$/.test(compact)) return true;
  return /^\+[1-9]\d{7,14}$/.test(compact);
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

export function isValidBankAccountNo(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  return /^\d{7,11}$/.test(digits);
}

export function isValidBankBranchCode(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  return /^\d{6}$/.test(digits);
}

export function optionalFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
