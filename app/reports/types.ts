/** Filter for attendance status in reports. */
export type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'early' | 'behind_on_hours';

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
}
