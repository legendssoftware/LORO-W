import { describe, expect, it } from 'vitest';
import type { MonthlyCalendarAttendanceRecord } from '@/api/types/attendance';
import {
  buildAttendanceExportTable,
  type AttendanceExportLabels,
  type AttendanceExportRecord,
} from './attendance-records-export';

const labels: AttendanceExportLabels = {
  employee: 'Employee',
  branch: 'Branch',
  date: 'Date',
  clockInTime: 'In',
  clockInLocation: 'In location',
  clockOutTime: 'Out',
  clockOutLocation: 'Out location',
  shiftDuration: 'Duration',
  sheetName: 'Attendance',
};

function record(overrides: Partial<MonthlyCalendarAttendanceRecord>): MonthlyCalendarAttendanceRecord {
  return {
    uid: 1,
    checkIn: '2026-11-26T06:00:00.000Z', // 08:00 SAST
    checkOut: '2026-11-26T14:30:00.000Z', // 16:30 SAST
    status: 'completed',
    duration: '8h 30m',
    ...overrides,
  };
}

function build(records: AttendanceExportRecord[], userBranch?: string) {
  return buildAttendanceExportTable({ userName: 'Raksha Misthry', userBranch, records, labels });
}

describe('buildAttendanceExportTable', () => {
  it('builds a row with times, locations, branch and duration', () => {
    const { headers, rows } = build([
      {
        date: '2026-11-26',
        attendanceRecord: record({
          branchName: 'Durban',
          checkInLocation: '1 Main Rd, Durban',
          checkOutLocation: '2 Side St, Durban',
        }),
      },
    ]);
    expect(headers).toHaveLength(8);
    expect(rows).toEqual([
      [
        'Raksha Misthry',
        'Durban',
        'Thu, 26 Nov 2026',
        '08:00',
        '1 Main Rd, Durban',
        '16:30',
        '2 Side St, Durban',
        '8h 30m',
      ],
    ]);
  });

  it('skips days without a clock-in and sorts oldest first', () => {
    const { rows } = build([
      { date: '2026-11-27', attendanceRecord: record({ checkIn: '2026-11-27T06:00:00.000Z', checkOut: '2026-11-27T14:00:00.000Z' }) },
      { date: '2026-11-25' },
      { date: '2026-11-24', attendanceRecord: record({ checkIn: '2026-11-24T06:00:00.000Z', checkOut: '2026-11-24T14:00:00.000Z' }) },
    ]);
    expect(rows.map((r) => r[2])).toEqual(['Tue, 24 Nov 2026', 'Fri, 27 Nov 2026']);
  });

  it('shows placeholders for a missing clock-out and falls back to the user branch', () => {
    const { rows } = build(
      [{ date: '2026-11-26', attendanceRecord: record({ checkOut: null, checkOutLocation: 'ignored', duration: null }) }],
      'Cape Town',
    );
    expect(rows[0]).toEqual([
      'Raksha Misthry',
      'Cape Town',
      'Thu, 26 Nov 2026',
      '08:00',
      '—',
      '—',
      '—',
      '—',
    ]);
  });

  it('appends the date when the clock-out is on a later day', () => {
    const { rows } = build([
      { date: '2026-11-26', attendanceRecord: record({ checkOut: '2026-11-27T00:10:00.000Z' }) }, // 02:10 SAST on 27 Nov
    ]);
    expect(rows[0][5]).toBe('02:10 (27 Nov)');
  });
});
