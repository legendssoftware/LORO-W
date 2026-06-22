import * as XLSX from 'xlsx';
import { COMPETITOR_IMPORT_SAMPLE_XLSX_FILENAME } from '@/api/types/competitors';

export const COMPETITOR_IMPORT_SAMPLE_XLSX_HEADERS = [
  'name',
  'competitorRef',
  'contactPhone',
  'street',
  'suburb',
  'city',
  'state',
  'country',
  'postalCode',
  'latitude',
  'longitude',
  'industry',
  'accountName',
  'LegalEntity',
  'TradingName',
  'isDirect',
  'status',
  'threatLevel',
  'geofenceRadius',
  'enableGeofence',
] as const;

function rowFromMap(
  headers: readonly string[],
  values: Partial<Record<(typeof COMPETITOR_IMPORT_SAMPLE_XLSX_HEADERS)[number], string>>
): string[] {
  return headers.map((h) => values[h as keyof typeof values] ?? '');
}

const EXAMPLE_ROW: Partial<
  Record<(typeof COMPETITOR_IMPORT_SAMPLE_XLSX_HEADERS)[number], string>
> = {
  name: 'CASHBUILD – Edenvale',
  competitorRef: 'CB-76a160843f7a32e4',
  contactPhone: '(+2711) 453 3149',
  street: 'Shop 25, Meadowdale Mall, Van Riebeeck Avenue, Edenvale.',
  suburb: 'Meadowdale Mall',
  city: 'Van Riebeeck Avenue',
  state: 'Edenvale.',
  country: 'South Africa',
  postalCode: '0000',
  latitude: '-26.136214',
  longitude: '28.150245',
  industry: 'Retail / Hardware',
  accountName: 'CASHBUILD',
  LegalEntity: 'CASHBUILD',
  TradingName: 'Edenvale',
  isDirect: 'true',
  status: 'active',
  threatLevel: '0',
  geofenceRadius: '5000',
  enableGeofence: 'false',
};

const MINIMAL_ROW: Partial<
  Record<(typeof COMPETITOR_IMPORT_SAMPLE_XLSX_HEADERS)[number], string>
> = {
  name: 'BUCO – Knysna',
  competitorRef: 'CB-b925d5168fd7f5f3',
  contactPhone: '(044) 302 2400',
  street: 'BUCO — Knysna (full address not in import source)',
  suburb: 'General',
  city: 'Knysna',
  state: 'Western Cape',
  country: 'South Africa',
  postalCode: '0000',
  industry: 'Retail / Hardware',
  accountName: 'BUCO',
  LegalEntity: 'BUCO',
  TradingName: 'Knysna',
  isDirect: 'true',
  status: 'active',
};

export function buildCompetitorImportSampleXlsxArrayBuffer(): ArrayBuffer {
  const headers = [...COMPETITOR_IMPORT_SAMPLE_XLSX_HEADERS];
  const aoa = [headers, rowFromMap(headers, EXAMPLE_ROW), rowFromMap(headers, MINIMAL_ROW)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Competitors');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array', bookSST: false });
}

export function triggerDownloadCompetitorImportSampleXlsx(): void {
  const buf = buildCompetitorImportSampleXlsxArrayBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = COMPETITOR_IMPORT_SAMPLE_XLSX_FILENAME;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
