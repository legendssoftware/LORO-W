import { describe, expect, it } from 'vitest';
import { neutralizeSpreadsheetCell } from './csv-export';

describe('neutralizeSpreadsheetCell', () => {
  it('prefixes formula triggers so spreadsheets treat the cell as text', () => {
    expect(neutralizeSpreadsheetCell('=CMD()')).toBe("'=CMD()");
    expect(neutralizeSpreadsheetCell('+1')).toBe("'+1");
    expect(neutralizeSpreadsheetCell('-10')).toBe("'-10");
    expect(neutralizeSpreadsheetCell('@sum')).toBe("'@sum");
    expect(neutralizeSpreadsheetCell('\t=1')).toBe("'\t=1");
    expect(neutralizeSpreadsheetCell('\r=1')).toBe("'\r=1");
  });

  it('leaves ordinary text unchanged', () => {
    expect(neutralizeSpreadsheetCell('Acme')).toBe('Acme');
    expect(neutralizeSpreadsheetCell('12')).toBe('12');
  });
});
