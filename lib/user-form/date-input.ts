import { format, isValid, parse } from 'date-fns';

export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

export type DatePickerPreset = 'default' | 'birthdate';

export function toIsoDateString(date: Date): string {
  return format(date, ISO_DATE_FORMAT);
}

export function maskDisplayDate(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatIsoToDisplay(iso?: string | null): string {
  if (!iso?.trim()) return '';
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isValid(parsed) ? format(parsed, DISPLAY_DATE_FORMAT) : '';
}

/**
 * Parses a typed date. Accepts `DD/MM/YYYY`, `D/M/YYYY`, `DD-MM-YYYY`, and `YYYY-MM-DD`.
 */
export function parseFlexibleDate(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (
      !isValidCalendarDate(parsed) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() + 1 !== month ||
      parsed.getDate() !== day
    ) {
      return undefined;
    }
    return parsed;
  }

  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!slash) return undefined;

  const day = Number(slash[1]);
  const month = Number(slash[2]);
  const year = Number(slash[3]);
  const padded = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  const parsed = parse(padded, DISPLAY_DATE_FORMAT, new Date());
  if (!isValidCalendarDate(parsed)) return undefined;
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day) {
    return undefined;
  }
  return parsed;
}

function isValidCalendarDate(parsed: Date): boolean {
  return isValid(parsed) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100;
}

export function ageFromIsoDate(value: string): number | null {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

export function birthdateRange(today = new Date()): {
  startMonth: Date;
  endMonth: Date;
  defaultMonth: Date;
  fromDate: Date;
  toDate: Date;
} {
  const fromDate = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate());
  const toDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  return {
    startMonth: new Date(fromDate.getFullYear(), fromDate.getMonth(), 1),
    endMonth: new Date(toDate.getFullYear(), toDate.getMonth(), 1),
    defaultMonth: new Date(today.getFullYear() - 27, 0, 1),
    fromDate,
    toDate,
  };
}

export function defaultDateRange(today = new Date()): {
  startMonth: Date;
  endMonth: Date;
  defaultMonth: Date;
} {
  return {
    startMonth: new Date(today.getFullYear() - 40, 0, 1),
    endMonth: new Date(today.getFullYear() + 15, 11, 1),
    defaultMonth: today,
  };
}
