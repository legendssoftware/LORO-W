import { format, parse } from 'date-fns';

const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format YYYY-MM pay period as "June 2026". */
export function formatPayslipPeriod(period: string | null | undefined): string {
  if (!period?.trim()) return '—';
  try {
    const parsed = parse(period.trim(), 'yyyy-MM', new Date());
    if (Number.isNaN(parsed.getTime())) return period;
    return format(parsed, 'MMMM yyyy');
  } catch {
    return period;
  }
}

/** Format numeric pay amount in ZAR; returns em dash when missing. */
export function formatPayslipAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return zarFormatter.format(Number(value));
}

export function formatPayslipEmployeeName(
  user: { name?: string | null; surname?: string | null } | null | undefined
): string {
  if (!user) return '—';
  const parts = [user.name, user.surname].filter(
    (p) => typeof p === 'string' && p.trim().length > 0
  );
  return parts.length > 0 ? parts.join(' ') : '—';
}

export function payslipStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'GENERATED':
      return 'Generated';
    case 'SENT':
      return 'Sent';
    case 'VIEWED':
      return 'Viewed';
    default:
      return status ?? '—';
  }
}

export function payslipStatusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'GENERATED':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    case 'SENT':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200';
    case 'VIEWED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function buildPayslipFileName(
  payslip: { uid: number; period?: string; payslipNumber?: string | null },
  serverFileName?: string
): string {
  if (serverFileName?.trim()) {
    const name = serverFileName.trim();
    return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
  }
  const base = payslip.payslipNumber?.trim() || `payslip-${payslip.uid}`;
  const period = payslip.period?.trim() || 'unknown';
  return `${base}-${period}.pdf`;
}
