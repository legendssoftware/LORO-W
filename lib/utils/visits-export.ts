/**
 * Visits (check-ins) export: Sales Person, Date and time, Check-In, Method, Company / Contact, Notes, Quote Number, Value, Follow Up.
 * Row order must be the same as API (checkInTime DESC); do not re-sort.
 */

import { format } from 'date-fns';
import type { VisitExportItem, CheckInContactAddress } from '@/api/types/reports';
import { exportToCsv, exportToExcel, exportToPdf } from './report-export';

export const VISITS_EXPORT_HEADERS = [
  'Sales Person',
  'Date and time',
  'Check-In',
  'Method of visit',
  'Company / Contact',
  'Notes',
  'Quote Number',
  'Value - ex-VAT',
  'Follow Up',
] as const;

const METHOD_OF_CONTACT_LABELS: Record<string, string> = {
  PHONE_CALL: 'Phone call',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  IN_PERSON_VISIT: 'In-person visit',
  VIDEO_CALL: 'Video call',
  OTHER: 'Other',
};

function parseDurationToMinutes(duration: string | null | undefined): number {
  if (!duration || typeof duration !== 'string') return 0;
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  return hours * 60 + minutes;
}

/** Format minutes for display: always "Xh Ym" (e.g. "0h 9m"). */
function formatDurationDisplay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function normalizeDurationDisplay(duration: string | null | undefined): string {
  if (duration == null || duration === '') return '-';
  return formatDurationDisplay(parseDurationToMinutes(duration));
}

function getMethodDisplay(c: VisitExportItem): string {
  if (c.methodOfContact) return formatMethodOfContact(c.methodOfContact);
  const hasLocation =
    (c.checkInLocation && c.checkInLocation !== '-') ||
    (c.checkOutLocation && c.checkOutLocation !== '-');
  return hasLocation ? 'In-person visit' : '-';
}

export function formatContactAddress(address: CheckInContactAddress | null | undefined): string {
  if (!address) return '-';
  if (typeof address === 'string') return address;
  if (address.formattedAddress) return address.formattedAddress;
  const parts = [
    address.streetNumber,
    address.street,
    address.suburb,
    address.city,
    address.state,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function formatContactDetails(c: VisitExportItem): string {
  const parts: string[] = [];
  if (c.contactCellPhone) parts.push(`Cell: ${c.contactCellPhone}`);
  if (c.contactLandline) parts.push(`Landline: ${c.contactLandline}`);
  if (c.contactEmail) parts.push(`Email: ${c.contactEmail}`);
  const addr = formatContactAddress(c.contactAddress);
  if (addr && addr !== '-') parts.push(addr);
  return parts.length > 0 ? parts.join(' | ') : '-';
}

export function formatMethodOfContact(methodOfContact?: string | null): string {
  if (!methodOfContact) return '-';
  return METHOD_OF_CONTACT_LABELS[methodOfContact] ?? methodOfContact.replace(/_/g, ' ');
}

function formatSalesPerson(c: VisitExportItem): string {
  const o = c.owner;
  if (!o) return '-';
  const fullName = [o.name, o.surname].filter(Boolean).join(' ').trim() || '-';
  const parts = [fullName];
  if (o.email) parts.push(o.email);
  if (o.phone) parts.push(o.phone);
  return parts.length > 1 ? parts.join(' | ') : fullName;
}

function formatCompanyAndContact(c: VisitExportItem): string {
  const lines: string[] = [];
  const companyName = c.companyName || '-';
  const type = c.businessType ? String(c.businessType).replace(/_/g, ' ') : null;
  lines.push(companyName + (type ? ` (${type})` : ''));
  const contactName = c.contactFullName || '-';
  const position = c.personSeenPosition;
  lines.push(`Contact person: ${contactName}` + (position ? ` - ${position}` : ''));
  lines.push(formatContactDetails(c));
  return lines.join('\n');
}

/**
 * Prefer reverse-geocoded address for export; fall back to coordinates when address is missing.
 */
function addressForExport(
  address: CheckInContactAddress | null | undefined,
  coordinatesFallback: string | null | undefined
): string {
  const formatted = formatContactAddress(address);
  if (formatted && formatted !== '-') return formatted;
  return coordinatesFallback && coordinatesFallback !== '-' ? coordinatesFallback : '-';
}

/**
 * Build a single row for export (Sales Person, Date and time, Check-In, Method, Company / Contact, Notes, Quote Number, Value, Follow Up).
 * Date and time: same as table (date, time range with en-dash, normalized duration "Xh Ym"). Method: "In-person visit" when location present and method empty.
 * Check-In column uses actual address (fullAddress / checkOutFullAddress) when available, otherwise coordinates.
 */
export function visitToExportRow(c: VisitExportItem): string[] {
  const dateLine = format(new Date(c.checkInTime), 'MMM d, yyyy,');
  const inTime = format(new Date(c.checkInTime), 'HH:mm');
  const outTime = c.checkOutTime ? format(new Date(c.checkOutTime), 'HH:mm') : '-';
  const timeLine = `${inTime} – ${outTime}`;
  const durationLine = normalizeDurationDisplay(c.duration);
  const dateAndTime = `${dateLine} ${timeLine} ${durationLine}`;

  const inAddr = addressForExport(c.fullAddress, c.checkInLocation);
  const outAddr = addressForExport(c.checkOutFullAddress, c.checkOutLocation);
  const checkInCell = `In: ${inAddr} | Out: ${outAddr}`;

  const valueExVat =
    c.salesValue != null
      ? `R ${Number(c.salesValue).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-';

  const followUpText = c.meetingLink
    ? (c.followUp || 'Open link')
    : (c.followUp || '-');

  return [
    formatSalesPerson(c),
    dateAndTime,
    checkInCell,
    getMethodDisplay(c),
    formatCompanyAndContact(c),
    c.notes || '-',
    c.quotationNumber || '-',
    valueExVat,
    followUpText,
  ];
}

/**
 * Export visits to CSV/Excel/PDF. Uses list in given order (do not re-sort).
 */
export function exportVisits(
  checkIns: VisitExportItem[],
  exportFormat: 'csv' | 'excel' | 'pdf',
  baseName: string
): void {
  const rows = checkIns.map(visitToExportRow);
  const headers = [...VISITS_EXPORT_HEADERS];
  if (exportFormat === 'csv') exportToCsv(headers, rows, baseName);
  else if (exportFormat === 'excel') exportToExcel(headers, rows, baseName);
  else exportToPdf(headers, rows, baseName);
}
