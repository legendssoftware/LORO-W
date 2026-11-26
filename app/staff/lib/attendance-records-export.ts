import { format, parseISO } from 'date-fns';
import type { MonthlyCalendarAttendanceRecord } from '@/api/types/attendance';
import { formatAttendanceClockDate, formatAttendanceClockTime } from '@/lib/attendance-time';
import { exportToExcel } from '@/lib/utils/report-export';

/** Placeholder for empty cells (matches the dialog table). */
const EMPTY_CELL = '—';

/** Minimal shape of a dialog row needed for export (kept structural to avoid importing the modal). */
export interface AttendanceExportRecord {
  /** Row date, yyyy-MM-dd. */
  date: string;
  attendanceRecord?: MonthlyCalendarAttendanceRecord;
}

export interface AttendanceExportLabels {
  employee: string;
  branch: string;
  date: string;
  clockInTime: string;
  clockInLocation: string;
  clockOutTime: string;
  clockOutLocation: string;
  shiftDuration: string;
  sheetName: string;
}

export interface AttendanceExportInput {
  userName: string;
  /** Fallback branch when the attendance record has none. */
  userBranch?: string | null;
  periodLabel: string;
  records: AttendanceExportRecord[];
  labels: AttendanceExportLabels;
}

/** Column widths (characters): employee, branch, date, in, in loc, out, out loc, duration. */
const COLUMN_WIDTHS = [24, 20, 18, 12, 48, 16, 48, 14];

/** Clock-out time; adds the date when the shift ended on a different day than it started. */
function formatClockOut(record: MonthlyCalendarAttendanceRecord, rowDate: string): string {
  const time = formatAttendanceClockTime(record.checkOut);
  if (!time) return EMPTY_CELL;
  const outDate = formatAttendanceClockDate(record.checkOut, 'yyyy-MM-dd');
  if (!outDate || outDate === rowDate) return time;
  return `${time} (${formatAttendanceClockDate(record.checkOut, 'd MMM')})`;
}

/**
 * Build the header and body rows for the attendance export.
 * Only days with a clock-in are included, oldest first.
 */
export function buildAttendanceExportTable({
  userName,
  userBranch,
  records,
  labels,
}: Omit<AttendanceExportInput, 'periodLabel'>): { headers: string[]; rows: string[][] } {
  const headers = [
    labels.employee,
    labels.branch,
    labels.date,
    labels.clockInTime,
    labels.clockInLocation,
    labels.clockOutTime,
    labels.clockOutLocation,
    labels.shiftDuration,
  ];

  const rows = records
    .filter((r) => !!r.attendanceRecord?.checkIn)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r): string[] => {
      const rec = r.attendanceRecord as MonthlyCalendarAttendanceRecord;
      const hasCheckOut = !!rec.checkOut;
      return [
        userName,
        rec.branchName?.trim() || userBranch?.trim() || EMPTY_CELL,
        format(parseISO(r.date), 'EEE, d MMM yyyy'),
        formatAttendanceClockTime(rec.checkIn) || EMPTY_CELL,
        rec.checkInLocation?.trim() || EMPTY_CELL,
        hasCheckOut ? formatClockOut(rec, r.date) : EMPTY_CELL,
        hasCheckOut ? rec.checkOutLocation?.trim() || EMPTY_CELL : EMPTY_CELL,
        rec.duration?.trim() || EMPTY_CELL,
      ];
    });

  return { headers, rows };
}

/** Make a string safe for use in a file name. */
function toFileNamePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Download the user's clocked shifts for the period as an .xlsx file. Returns the row count. */
export function exportAttendanceRecordsToExcel(input: AttendanceExportInput): number {
  const { headers, rows } = buildAttendanceExportTable(input);
  const baseName = [toFileNamePart(input.userName), 'attendance', toFileNamePart(input.periodLabel)]
    .filter(Boolean)
    .join('-');
  exportToExcel(headers, rows, baseName, {
    sheetName: input.labels.sheetName,
    freezeHeader: true,
    boldHeader: true,
    columnWidths: COLUMN_WIDTHS,
  });
  return rows.length;
}
