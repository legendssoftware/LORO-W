import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  countLeadImportDataRows,
  LARGE_IMPORT_ROW_THRESHOLD,
} from './count-lead-import-data-rows';

describe('countLeadImportDataRows', () => {
  it('counts CSV data rows excluding header and blank lines', async () => {
    const csv = 'Name,Email\nAlice,a@x.com\n\nBob,b@x.com\n';
    const file = new File([csv], 'leads.csv', { type: 'text/csv' });
    expect(await countLeadImportDataRows(file)).toBe(2);
  });

  it('returns 0 for CSV with only a header', async () => {
    const csv = 'Name,Email,Phone\n';
    const file = new File([csv], 'empty.csv', { type: 'text/csv' });
    expect(await countLeadImportDataRows(file)).toBe(0);
  });

  it('returns 0 for empty CSV', async () => {
    const file = new File([''], 'empty.csv', { type: 'text/csv' });
    expect(await countLeadImportDataRows(file)).toBe(0);
  });

  it('counts xlsx first sheet data rows', async () => {
    const wb = XLSX.utils.book_new();
    const aoa = [
      ['Name', 'Email'],
      ['A', 'a@test.com'],
      ['B', 'b@test.com'],
      ['C', 'c@test.com'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new File([buf], 'leads.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(await countLeadImportDataRows(file)).toBe(3);
  });

  it('ignores trailing empty rows in xlsx', async () => {
    const wb = XLSX.utils.book_new();
    const aoa = [['H1', 'H2'], ['x', 'y'], ['', ''], ['', '']];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new File([buf], 'sparse.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(await countLeadImportDataRows(file)).toBe(1);
  });

  it('exports threshold used by importer', () => {
    expect(LARGE_IMPORT_ROW_THRESHOLD).toBe(50);
  });
});
