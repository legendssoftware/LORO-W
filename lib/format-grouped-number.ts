/** Thousands separators for simulation inputs. Uses commas, as in 2,000,000. */

function groupIntegerDigits(digits: string): string {
  if (!digits) return '';
  const normalized = digits.replace(/^0+(?=\d)/, '');
  const parsed = Number(normalized || '0');
  if (!Number.isFinite(parsed)) return '';
  return parsed.toLocaleString('en-US');
}

/** Format typed text with commas, keeping one optional decimal point. */
export function formatGroupedNumberInput(
  raw: string,
  allowDecimal: boolean,
): string {
  const cleaned = allowDecimal
    ? raw.replace(/[^\d.]/g, '')
    : raw.replace(/[^\d]/g, '');
  if (!cleaned) return '';
  const dot = cleaned.indexOf('.');
  const intPart = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const fraction =
    dot === -1 ? '' : cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const grouped = groupIntegerDigits(intPart);
  if (!allowDecimal || dot === -1) return grouped;
  return `${grouped || '0'}.${fraction}`;
}

/** Parse a comma-grouped field. Empty and lone "." are not numbers. */
export function parseGroupedNumber(display: string): number | null {
  if (!display || display === '.') return null;
  const value = Number(display.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

/** Format a stored number for display. */
export function formatGroupedNumber(
  value: number,
  allowDecimal: boolean,
): string {
  if (!Number.isFinite(value)) return '';
  if (!allowDecimal) return Math.round(value).toLocaleString('en-US');
  const [intPart, fraction] = String(value).split('.');
  const grouped = Number(intPart).toLocaleString('en-US');
  return fraction != null ? `${grouped}.${fraction}` : grouped;
}
