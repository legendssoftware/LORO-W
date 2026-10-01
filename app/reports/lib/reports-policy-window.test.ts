import { describe, expect, it } from 'vitest';
import {
  calendarMonthOfRange,
  isPolicyRangeTooLong,
  isPolicyWindowClosed,
  previousMonthRange,
  toPolicyWindow,
} from './reports-policy-window';

const TODAY = new Date(Date.UTC(2026, 9, 15));

describe('reports policy window', () => {
  it('detects whole calendar months, including leap February', () => {
    expect(calendarMonthOfRange('2026-09-01', '2026-09-30')).toBe('2026-09');
    expect(calendarMonthOfRange('2028-02-01', '2028-02-29')).toBe('2028-02');
    expect(calendarMonthOfRange('2026-09-01', '2026-09-29')).toBeNull();
    expect(calendarMonthOfRange('2026-09-02', '2026-09-30')).toBeNull();
  });

  it('sends a whole past month as `month` so a finalised snapshot can be used', () => {
    expect(toPolicyWindow('2026-09-01', '2026-09-30', TODAY)).toEqual({ month: '2026-09' });
  });

  it('sends the current whole month as `month` even though it has not ended', () => {
    expect(toPolicyWindow('2026-10-01', '2026-10-31', TODAY)).toEqual({ month: '2026-10' });
  });

  it('sends custom ranges as from/to and clamps a future end to today', () => {
    expect(toPolicyWindow('2026-09-10', '2026-09-20', TODAY)).toEqual({ from: '2026-09-10', to: '2026-09-20' });
    expect(toPolicyWindow('2026-10-05', '2026-10-25', TODAY)).toEqual({ from: '2026-10-05', to: '2026-10-15' });
  });

  it('flags ranges longer than the server accepts', () => {
    expect(isPolicyRangeTooLong('2026-01-01', '2026-04-03')).toBe(true);
    expect(isPolicyRangeTooLong('2026-07-01', '2026-09-30')).toBe(false);
  });

  it('treats a window as closed only after its last day', () => {
    expect(isPolicyWindowClosed('2026-10-14', TODAY)).toBe(true);
    expect(isPolicyWindowClosed('2026-10-15', TODAY)).toBe(false);
  });

  it('finds the previous calendar month across a year boundary', () => {
    const range = previousMonthRange(new Date(Date.UTC(2026, 0, 10)));
    expect(range.start.toISOString().slice(0, 10)).toBe('2025-12-01');
    expect(range.end.toISOString().slice(0, 10)).toBe('2025-12-31');
  });
});
