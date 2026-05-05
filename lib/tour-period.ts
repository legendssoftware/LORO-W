/** Local calendar month, `YYYY-MM`, for tour frequency gating. */
export function getCurrentYearMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isYearMonthString(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}
