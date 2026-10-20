export function formatTakeoffMoney(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatQty(value: number): string {
  const numeric = Number(value) || 0;
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}

/** `ea` is the catalogue unit for one piece. */
export function formatTakeoffUnit(unit: string | null | undefined): string {
  const value = (unit ?? '').trim();
  if (value.toLowerCase() === 'ea') return 'each';
  return value;
}
