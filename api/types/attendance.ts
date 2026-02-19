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
    status: "attended" | "missed" | "future";
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
    checkInLatitude?: number;
    checkInLongitude?: number;
    checkInNotes: string;
    branch?: { uid: number };
}

export interface CheckOutBody {
    checkOut: string;
    checkOutNotes: string;
    checkOutLatitude?: number;
    checkOutLongitude?: number;
}

/** GET /att/report - organization attendance report (date range, per-user metrics). */
export interface AttendanceReportUserInfo {
    name: string;
    email: string;
    role?: string;
    branch?: string;
    department?: string;
    phone?: string | null;
}

export interface AttendanceReportUserMetric {
    userId: number;
    userInfo: AttendanceReportUserInfo;
    metrics: Record<string, unknown> & {
        totalHours?: number;
        totalShifts?: number;
        firstAttendance?: { date: string | null; checkInTime: string | null };
    };
}

export interface AttendanceReportResponse {
    message: string;
    report: {
        reportPeriod: {
            from: string;
            to: string;
            totalDays?: number;
            generatedAt?: string;
        };
        userMetrics: AttendanceReportUserMetric[];
        organizationMetrics?: Record<string, unknown>;
    };
}

/** POST /att/metrics/monthly - monthly metrics for all users. */
export interface MonthlyMetricsUserItem {
    userId: number;
    userName: string;
    totalShifts: number;
    totalHours: number;
    overtimeHours: number;
    checkIns?: unknown[];
}

export interface MonthlyMetricsResponse {
    message: string;
    data: {
        period: {
            year: number;
            month: number;
            startDate: string;
            endDate: string;
        };
        summary: {
            totalUsers: number;
            totalShifts: number;
            totalHours: number;
            totalOvertimeHours: number;
            averageHoursPerUser?: number;
        };
        userMetrics: MonthlyMetricsUserItem[];
    };
}

/** GET /att/daily-overview - single-date present/absent users. */
export interface DailyOverviewUser {
    uid: number;
    name: string;
    surname: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    profileImage?: string | null;
    branchId?: number | null;
    branchName: string;
    accessLevel?: string;
    checkInTime?: string;
    checkOutTime?: string | null;
    status?: string;
    workingHours?: string | null;
    lastSeenDate?: string | null;
    employeeSince?: string;
    isActive?: boolean;
    role?: string;
    earlyMinutes?: number;
    lateMinutes?: number;
    /** Decoded full address of shift start (clock-in) location. Present users only. */
    shiftStartAddress?: string | null;
}

export interface DailyOverviewResponse {
    message: string;
    data: {
        date: string;
        totalEmployees: number;
        presentEmployees: number;
        absentEmployees: number;
        attendanceRate: number;
        presentUsers: DailyOverviewUser[];
        absentUsers: DailyOverviewUser[];
    };
}
