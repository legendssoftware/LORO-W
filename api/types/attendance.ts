/**
 * Attendance API types.
 * Aligned with server GET /att/status response.
 */

export interface AttStatusResponse {
  checkedIn: boolean;
  nextAction?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  attendance?: {
    checkIn?: string;
    checkOut?: string | null;
    status?: string;
  } | null;
}

/** GET /att/metrics response (self). Used for Total hours card and streak. */
export interface AttendanceMetrics {
  totalHours: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime: number;
  };
  attendanceStreak?: number;
}

export interface AttendanceMetricsResponse {
  message: string;
  metrics: AttendanceMetrics;
}

/** Single day in monthly attendance (GET /att/user/:ref/monthly) */
export interface MonthlyAttendanceDay {
  date: string;
  dayNumber: number;
  dayOfWeek: number;
  status: 'attended' | 'missed' | 'future';
  attendanceRecord?: unknown;
}

export interface MonthlyAttendanceResponse {
  month: number;
  year: number;
  monthName: string;
  firstDayOfWeek: number;
  totalDays: number;
  days: MonthlyAttendanceDay[];
}

export interface CheckInBody {
  status: string;
  checkIn: string;
  checkInLatitude: number;
  checkInLongitude: number;
  checkInNotes: string;
  branch?: { uid: number };
}

export interface CheckOutBody {
  checkOut: string;
  checkOutNotes: string;
  checkOutLatitude: number;
  checkOutLongitude: number;
}
