/** Filter for attendance status in reports. */
export type StatusFilter =
  | 'all'
  | 'present'
  | 'absent'
  | 'late'
  | 'early'
  | 'behind_on_hours'
  | 'idle'
  | 'at_office'
  | 'work_from_home'
  | 'starting_from_home'
  | 'offsite'
  | 'driving';

/** Unified card item: user identity + hours + present/absent for the period. */
export interface ReportCardUser {
  userId: number;
  ref: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  branch?: string;
  photoURL?: string | null;
  hoursThisMonth: number;
  progressPercent: number;
  isPresent: boolean;
  earlyMinutes?: number;
  lateMinutes?: number;
  shiftStartAddress?: string | null;
  /** From daily overview (present): check-in/out, shift info */
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workingHours?: string | null;
  shiftDuration?: string | null;
  isOnBreak?: boolean;
  attendanceStatus?: string | null;
  /** From daily overview (absent): employment info */
  lastSeenDate?: string | null;
  employeeSince?: string | null;
  isActive?: boolean;
  /** From monthly metrics */
  totalShifts?: number;
  overtimeHours?: number;
  /** Access level for tags (role/accessLevel/branch) */
  accessLevel?: string | null;
  /** First attendance datetime (ISO) and last date in 7-day period */
  firstAttendanceInPeriod?: string | null;
  lastAttendanceInPeriod?: string | null;
  /** Last app access (Clerk session lastActiveAt) in org timezone */
  lastAppAccessAt?: string | null;
  /** Device type from Clerk session (phone or laptop) */
  lastAppAccessDeviceType?: 'phone' | 'laptop' | null;
  /** Distance in meters from branch to clock-in (present only) */
  distanceFromWorkplaceMeters?: number | null;
  /** Employee HR ID (Employee Code) */
  hrID?: number | null;
  /** Clock-in note / mode label for today (present only). */
  checkInNotes?: string | null;
  /** Last 7 days attendance status (attended/missed/future) from monthly metrics. */
  last7Days?: Array<{ date: string; status: 'attended' | 'missed' | 'future' }>;
  /** Payroll-period hours (when merged from Staff payroll API). */
  payrollHours?: number;
  /** Payroll-period target hours (fixed cap: EXPECTED_MONTHLY_HOURS, 180h). */
  payrollTargetHours?: number;
  /** Prorated expected hours by today within the payroll period. */
  payrollExpectedByNow?: number;
  /** Progress % for payroll period: (payrollHours / payrollTargetHours) × 100. */
  payrollProgressPercent?: number;
}
