/** Filter for attendance status in reports. */
export type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'early';

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
}
