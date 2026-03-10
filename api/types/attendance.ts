/**
 * Attendance API types.
 * Aligned with server GET /att/status response.
 */

export interface AttStatusResponse {
    checkedIn: boolean;
    nextAction?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    breakStartTime?: string | null;
    attendance?: {
        checkIn?: string;
        checkOut?: string | null;
        status?: string;
    } | null;
}

/** POST /att/break - start or end a break. */
export interface BreakBody {
    isStartingBreak: boolean;
    breakNotes?: string;
    breakLatitude?: number;
    breakLongitude?: number;
}

/** GET /att/metrics response (self). Used for Total hours card and streak. */
export interface AttendanceMetrics {
    totalHours: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        /** Hours in payroll period (26th previous month to 25th current month) */
        payrollHours: number;
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

/** GET /att/report - organization-level totals and insights. */
export interface AttendanceReportOrganizationMetrics {
    totals?: {
        totalEmployees?: number;
        totalHours: number;
        totalShifts: number;
        overtimeHours?: number;
    };
    insights?: {
        attendanceRate: number;
        punctualityRate?: number;
        averageHoursPerDay?: number;
        peakCheckInTime?: string;
        peakCheckOutTime?: string;
    };
    byBranch?: unknown[];
    byRole?: unknown[];
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
        organizationMetrics?: AttendanceReportOrganizationMetrics;
    };
}

/** Last 7 days attendance status for staff grid. */
export interface Last7DaysItem {
    date: string;
    status: 'attended' | 'missed' | 'future';
}

/** POST /att/metrics/monthly - monthly metrics for all users. */
export interface MonthlyMetricsUserItem {
    userId: number;
    userName: string;
    totalShifts: number;
    totalHours: number;
    overtimeHours: number;
    checkIns?: unknown[];
    /** Last 7 days attendance status (attended/missed/future) for staff grid. */
    last7Days?: Last7DaysItem[];
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
    /** Present users: e.g. "8h 30m" or "In Progress". */
    shiftDuration?: string | null;
    /** Present users: true when status is on break. */
    isOnBreak?: boolean;
    lastSeenDate?: string | null;
    employeeSince?: string;
    isActive?: boolean;
    role?: string;
    earlyMinutes?: number;
    lateMinutes?: number;
    /** Decoded full address of shift start (clock-in) location. Present users only. */
    shiftStartAddress?: string | null;
    /** First attendance datetime (ISO) in the 7-day period. */
    firstAttendanceInPeriod?: string | null;
    /** Last date (yyyy-MM-dd) user attended in the 7-day period. */
    lastAttendanceInPeriod?: string | null;
    /** Last app access from Clerk session lastActiveAt in org timezone. */
    lastAppAccessAt?: string | null;
    /** Device type from Clerk session (phone or laptop). */
    lastAppAccessDeviceType?: 'phone' | 'laptop' | null;
    /** Distance in meters from branch to clock-in. Present users only. */
    distanceFromWorkplaceMeters?: number | null;
    /** Employee HR ID for reports (Employee Code). */
    hrID?: number | null;
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
