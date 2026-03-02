/**
 * Leads export: CSV, Excel, PDF.
 * Column order aligned with LeadListItem fields.
 */

import { format } from 'date-fns';
import type { LeadListItem } from '@/api/types/leads';
import { exportToCsv, exportToExcel, exportToPdf } from './report-export';

export const LEADS_EXPORT_HEADERS = [
  'Name',
  'Email',
  'Phone',
  'Company',
  'Status',
  'Source',
  'Temperature',
  'Priority',
  'Lead Score',
  'Estimated Value',
  'Owner',
  'Created',
] as const;

function ownerDisplay(lead: LeadListItem): string {
  const o = lead.owner;
  if (!o) return '-';
  const full = [o.name, o.surname].filter(Boolean).join(' ').trim();
  return full || o.email || '-';
}

/**
 * Build a single row for export; column order matches LEADS_EXPORT_HEADERS.
 */
export function leadToExportRow(lead: LeadListItem): string[] {
  const created =
    lead.createdAt && !Number.isNaN(new Date(lead.createdAt).getTime())
      ? format(new Date(lead.createdAt), 'yyyy-MM-dd HH:mm')
      : '-';
  return [
    lead.name?.trim() ?? '-',
    lead.email?.trim() ?? '-',
    lead.phone?.trim() ?? '-',
    lead.companyName?.trim() ?? '-',
    lead.status?.trim() ?? '-',
    lead.source?.trim() ?? '-',
    lead.temperature?.trim() ?? '-',
    lead.priority?.trim() ?? '-',
    lead.leadScore != null ? String(lead.leadScore) : '-',
    lead.estimatedValue != null ? String(lead.estimatedValue) : '-',
    ownerDisplay(lead),
    created,
  ];
}

/**
 * Export leads to CSV/Excel/PDF. Uses list in given order.
 */
export function exportLeads(
  leads: LeadListItem[],
  exportFormat: 'csv' | 'excel' | 'pdf',
  baseName: string
): void {
  const rows = leads.map(leadToExportRow);
  const headers = [...LEADS_EXPORT_HEADERS];
  if (exportFormat === 'csv') exportToCsv(headers, rows, baseName);
  else if (exportFormat === 'excel') exportToExcel(headers, rows, baseName);
  else exportToPdf(headers, rows, baseName);
}
