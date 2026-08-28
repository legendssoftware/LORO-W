import { describe, expect, it } from 'vitest';
import { parseContentDispositionFilename } from './reports-travel-export';

describe('parseContentDispositionFilename', () => {
  it('reads a quoted filename', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="travel-report-2026-08-01-to-2026-08-31.xlsx"',
        'fallback.xlsx'
      )
    ).toBe('travel-report-2026-08-01-to-2026-08-31.xlsx');
  });

  it('falls back when the header is missing', () => {
    expect(parseContentDispositionFilename(undefined, 'fallback.xlsx')).toBe(
      'fallback.xlsx'
    );
  });
});
