/**
 * Visits (check-ins) export: columns aligned with reports table (Sales Person, Date and time, merged location, method, contact fields, notes, quote, value, relations).
 * Row order must be the same as API (checkInTime DESC); do not re-sort.
 */

import { format } from 'date-fns';
import type { VisitExportItem, CheckInContactAddress } from '@/api/types/reports';
import { exportToCsv, exportToExcel, exportToPdf } from './report-export';

export const VISITS_EXPORT_HEADERS = [
  'Sales Person',
  'Date and time',
  'Check-in / Check-out location',
  'Method',
  'Building type',
  'Contact made',
  'Company',
  'Business type',
  'Person seen position',
  'Contact name',
  'Contact image',
  'Cell',
  'Landline',
  'Contact email',
  'Contact address',
  'Meeting link',
  'Notes',
  'Resolution',
  'Follow Up',
  'Quote Number',
  'Quotation status',
  'Value - ex-VAT',
  'Lead',
  'Client',
  'Branch',
] as const;

/** Method of contact display labels; new enum values (Physical, Telephone, Email, Whatsapp) pass through; legacy values mapped for backward compatibility. */
const METHOD_OF_CONTACT_LABELS: Record<string, string> = {
  Physical: 'Physical',
  Telephone: 'Telephone',
  Email: 'Email',
  Whatsapp: 'Whatsapp',
  'in-person': 'Physical',
  'phone-call': 'Telephone',
  email: 'Email',
  whatsapp: 'Whatsapp',
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
  return hasLocation ? 'Physical' : '-';
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

/**
 * Extract region string from a visit (for region filter and grouping).
 * Uses fullAddress, checkOutFullAddress, or contactAddress.
 */
export function extractRegionFromVisit(c: VisitExportItem): string {
  const addr: CheckInContactAddress | null | undefined =
    c.fullAddress ?? c.checkOutFullAddress ?? c.contactAddress;
  if (!addr) return 'Not set';
  const cityOrRegion = (addr.city ?? addr.state ?? '').trim();
  const postalCode = addr.postalCode?.trim() ?? '';
  const country = (addr.country ?? '').trim();
  const fromStructured = [cityOrRegion, postalCode, country].filter(Boolean).join(', ');
  if (fromStructured) return fromStructured;
  const formatted = (addr.formattedAddress ?? '').trim();
  if (!formatted) return 'Not set';
  const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return 'Not set';
  const secondLast = parts[parts.length - 2];
  const codePart = /^\d{4,5}$/.test(secondLast) ? secondLast : '';
  const cityPart = codePart ? parts[parts.length - 3] ?? '' : secondLast;
  const countryPart = parts[parts.length - 1];
  return [cityPart, codePart, countryPart].filter(Boolean).join(', ') || 'Not set';
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

function formatContactMade(value: boolean | string | null | undefined): string {
  if (value === true || value === 'YES') return 'Yes';
  if (value === false || value === 'NO') return 'No';
  return '-';
}

/**
 * Build a single row for export; column order matches VISITS_EXPORT_HEADERS (same as reports table).
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
  const locationMerged = `In: ${inAddr} | Out: ${outAddr}`;

  const valueExVat =
    c.salesValue != null
      ? `R ${Number(c.salesValue).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-';

  const followUpText = c.followUp?.trim() || '-';

  return [
    formatSalesPerson(c),
    dateAndTime,
    locationMerged,
    getMethodDisplay(c),
    c.buildingType ? String(c.buildingType).replace(/_/g, ' ') : '-',
    formatContactMade(c.contactMade),
    c.companyName?.trim() || '-',
    c.businessType ? String(c.businessType).replace(/_/g, ' ') : '-',
    c.personSeenPosition?.trim() || '-',
    c.contactFullName?.trim() || '-',
    c.contactImage?.trim() || '-',
    c.contactCellPhone?.trim() || '-',
    c.contactLandline?.trim() || '-',
    c.contactEmail?.trim() || '-',
    formatContactAddress(c.contactAddress),
    c.meetingLink?.trim() || '-',
    c.notes || '-',
    c.resolution || '-',
    followUpText,
    c.quotationNumber || '-',
    c.quotationStatus ? String(c.quotationStatus).replace(/_/g, ' ') : '-',
    valueExVat,
    c.lead?.name?.trim() || '-',
    c.client?.name?.trim() || '-',
    c.branch?.name?.trim() || '-',
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
