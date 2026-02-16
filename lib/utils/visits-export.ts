/**
 * Visits (check-ins) export: 12-column format matching APK export.
 * Row order must be the same as API (checkInTime DESC); do not re-sort.
 */

import { format } from 'date-fns';
import type { VisitExportItem, CheckInContactAddress } from '@/api/types/reports';
import { exportToCsv, exportToExcel, exportToPdf } from './report-export';

export const VISITS_EXPORT_HEADERS = [
  'Date and time',
  'Check-In',
  'Method of visit',
  'Company Name',
  'Type of Business',
  'Person Seen',
  'Position of Person Seen',
  'Contact Details',
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

/**
 * Build a single row for export (same order as APK).
 */
export function visitToExportRow(c: VisitExportItem): string[] {
  const datePart = format(new Date(c.checkInTime), 'MMM d, yyyy, HH:mm');
  const outPart = c.checkOutTime ? format(new Date(c.checkOutTime), 'HH:mm') : '-';
  const durationPart = c.duration || '-';
  const dateAndTime = `${datePart} - ${outPart} - ${durationPart}`;

  const checkInCell = `In: ${c.checkInLocation || '-'} | Out: ${c.checkOutLocation || '-'}`;

  const valueExVat =
    c.salesValue != null
      ? `R ${Number(c.salesValue).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-';

  const followUpText = c.meetingLink
    ? (c.followUp || 'Open link')
    : (c.followUp || '-');

  return [
    dateAndTime,
    checkInCell,
    formatMethodOfContact(c.methodOfContact),
    c.companyName || '-',
    c.businessType ? String(c.businessType).replace(/_/g, ' ') : '-',
    c.contactFullName || '-',
    c.personSeenPosition || '-',
    formatContactDetails(c),
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
