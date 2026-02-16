import type { AxiosInstance } from "axios";
import type {
    AttStatusResponse,
    AttendanceMetricsResponse,
    AttendanceReportResponse,
    CheckInBody,
    CheckOutBody,
    DailyOverviewResponse,
    MonthlyAttendanceResponse,
    MonthlyMetricsResponse,
} from "@/api/types";

/**
 * GET /att/status - current attendance status for the authenticated user.
 */
export async function getAttStatus(
    client: AxiosInstance
): Promise<AttStatusResponse> {
    const { data } = await client.get<AttStatusResponse>("/att/status");
    return data;
}

/**
 * GET /att/metrics - attendance metrics for the authenticated user (self).
 */
export async function getAttMetrics(
    client: AxiosInstance
): Promise<AttendanceMetricsResponse> {
    const { data } =
        await client.get<AttendanceMetricsResponse>("/att/metrics");
    return data;
}

/**
 * GET /att/user/:ref/monthly - monthly attendance calendar (attended/missed/future per day).
 */
export async function getMonthlyAttendance(
    client: AxiosInstance,
    ref: string | number,
    params?: { year?: number; month?: number }
): Promise<MonthlyAttendanceResponse> {
    const search = new URLSearchParams();
    if (params?.year != null) search.set("year", String(params.year));
    if (params?.month != null) search.set("month", String(params.month));
    const qs = search.toString();
    const { data } = await client.get<MonthlyAttendanceResponse>(
        `/att/user/${ref}/monthly${qs ? `?${qs}` : ""}`
    );
    return data;
}

/**
 * POST /att/in - check in.
 */
export async function checkIn(
    client: AxiosInstance,
    body: CheckInBody
): Promise<unknown> {
    const { data } = await client.post("/att/in", body);
    return data;
}

/**
 * POST /att/out - check out.
 */
export async function checkOut(
    client: AxiosInstance,
    body: CheckOutBody
): Promise<unknown> {
    const { data } = await client.post("/att/out", body);
    return data;
}

/** Query params for GET /att/report. */
export interface AttendanceReportParams {
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
    role?: string;
    includeUserDetails?: boolean;
}

/**
 * GET /att/report - organization attendance report (date range, per-user metrics).
 * Admin/Manager/HR.
 */
export async function getAttendanceReport(
    client: AxiosInstance,
    params: AttendanceReportParams = {}
): Promise<AttendanceReportResponse> {
    const search = new URLSearchParams();
    if (params.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params.dateTo) search.set("dateTo", params.dateTo);
    if (params.branchId) search.set("branchId", params.branchId);
    if (params.role) search.set("role", params.role);
    if (params.includeUserDetails !== undefined)
        search.set("includeUserDetails", String(params.includeUserDetails));
    const qs = search.toString();
    const { data } = await client.get<AttendanceReportResponse>(
        `/att/report${qs ? `?${qs}` : ""}`
    );
    return data;
}

/** Body for POST /att/metrics/monthly. */
export interface MonthlyMetricsBody {
    year?: number;
    month?: number;
    branchId?: number;
    orgId?: number;
    excludeOvertimeDates?: string[];
}

/**
 * POST /att/metrics/monthly - monthly attendance metrics for all users.
 * Admin/Manager/HR.
 */
export async function getMonthlyMetrics(
    client: AxiosInstance,
    body: MonthlyMetricsBody = {}
): Promise<MonthlyMetricsResponse> {
    const { data } = await client.post<MonthlyMetricsResponse>(
        "/att/metrics/monthly",
        body
    );
    return data;
}

/** Params for GET /att/daily-overview. */
export interface DailyOverviewParams {
    date?: string; // YYYY-MM-DD
}

/**
 * GET /att/daily-overview - daily present/absent users for a specific date.
 */
export async function getDailyOverview(
    client: AxiosInstance,
    params: DailyOverviewParams = {}
): Promise<DailyOverviewResponse> {
    const search = new URLSearchParams();
    if (params.date) search.set("date", params.date);
    const qs = search.toString();
    const { data } = await client.get<DailyOverviewResponse>(
        `/att/daily-overview${qs ? `?${qs}` : ""}`
    );
    return data;
}
