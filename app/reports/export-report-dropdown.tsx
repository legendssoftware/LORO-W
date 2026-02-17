'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { getDailyOverview, getMonthlyMetrics } from '@/api/endpoints/attendance';
import { useApiClient } from '@/api/hooks';
import type { DailyOverviewUser, MonthlyMetricsUserItem } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { BarChart3Icon, CalendarIcon, ChevronDownIcon, DownloadIcon, Loader2Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/report-export';

const ATTENDANCE_HEADERS = [
    'Name',
    'Email',
    'Phone',
    'Role',
    'Branch',
    'Status',
    'Check-in Time',
    'Check-out Time',
];

const METRICS_HEADERS = [
    'User ID',
    'User Name',
    'Total Shifts',
    'Total Hours',
    'Overtime Hours',
];

function dailyUserToRow(u: DailyOverviewUser, status: 'Present' | 'Absent'): string[] {
    const name = u.fullName || [u.name, u.surname].filter(Boolean).join(' ').trim();
    return [
        name,
        u.email ?? '',
        u.phoneNumber ?? '',
        u.accessLevel ?? u.role ?? '',
        u.branchName ?? '',
        status,
        u.checkInTime ?? '',
        u.checkOutTime ?? '',
    ];
}

function metricsUserToRow(u: MonthlyMetricsUserItem): string[] {
    return [
        String(u.userId),
        u.userName,
        String(u.totalShifts),
        String(u.totalHours),
        String(u.overtimeHours),
    ];
}

/** Parse "HH:mm" or "HH:mm:ss" to minutes since midnight. Returns NaN if invalid. */
function timeStringToMinutes(s: string | null | undefined): number {
    if (!s?.trim()) return NaN;
    const parts = s.trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    if (Number.isNaN(h)) return NaN;
    return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** Compute hours between check-in and check-out time strings. Returns 0 if invalid or missing. */
function computeHoursFromTimes(
    checkInTime: string | null | undefined,
    checkOutTime: string | null | undefined
): number {
    const start = timeStringToMinutes(checkInTime);
    const end = timeStringToMinutes(checkOutTime);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
    return (end - start) / 60;
}

function dailyOverviewUserToMetricsRow(u: DailyOverviewUser, present: boolean): string[] {
    const name = u.fullName || [u.name, u.surname].filter(Boolean).join(' ').trim();
    if (!present) return [String(u.uid), name, '0', '0', '0'];
    const hours = computeHoursFromTimes(u.checkInTime, u.checkOutTime);
    return [String(u.uid), name, '1', String(hours.toFixed(2)), '0'];
}

export interface ExportReportDropdownProps {
    singleDate: Date | null;
}

export function ExportReportDropdown({ singleDate }: ExportReportDropdownProps) {
    const client = useApiClient();
    const [loading, setLoading] = useState(false);
    const [customDate, setCustomDate] = useState<Date | null>(null);
    const [customOpen, setCustomOpen] = useState(false);

    const today = new Date();
    const showThisEvening = today.getHours() >= 17;

    async function runAttendanceExport(date: Date, exportFormat: 'csv' | 'excel' | 'pdf') {
        setLoading(true);
        try {
            const res = await getDailyOverview(client, {
                date: format(date, 'yyyy-MM-dd'),
            });
            const data = res.data;
            if (!data) throw new Error('No data');
            const presentRows = data.presentUsers.map((u) => dailyUserToRow(u, 'Present'));
            const absentRows = data.absentUsers.map((u) => dailyUserToRow(u, 'Absent'));
            const rows = [...presentRows, ...absentRows];
            const baseName = `attendance-${format(date, 'yyyy-MM-dd')}`;
            if (exportFormat === 'csv') exportToCsv(ATTENDANCE_HEADERS, rows, baseName);
            else if (exportFormat === 'excel') exportToExcel(ATTENDANCE_HEADERS, rows, baseName);
            else exportToPdf(ATTENDANCE_HEADERS, rows, baseName);
            toast.success('Export downloaded');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Export failed';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    async function runMetricsExportToday(date: Date, exportFormat: 'csv' | 'excel' | 'pdf') {
        setLoading(true);
        try {
            const res = await getDailyOverview(client, {
                date: format(date, 'yyyy-MM-dd'),
            });
            const data = res.data;
            if (!data) throw new Error('No data');
            const presentRows = data.presentUsers.map((u) => dailyOverviewUserToMetricsRow(u, true));
            const absentRows = data.absentUsers.map((u) => dailyOverviewUserToMetricsRow(u, false));
            const rows = [...presentRows, ...absentRows];
            const baseName = `metrics-${format(date, 'yyyy-MM-dd')}`;
            if (exportFormat === 'csv') exportToCsv(METRICS_HEADERS, rows, baseName);
            else if (exportFormat === 'excel') exportToExcel(METRICS_HEADERS, rows, baseName);
            else exportToPdf(METRICS_HEADERS, rows, baseName);
            toast.success('Export downloaded');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Export failed';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    async function runMetricsExportMonth(exportFormat: 'csv' | 'excel' | 'pdf') {
        const date = singleDate ?? today;
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        setLoading(true);
        try {
            const res = await getMonthlyMetrics(client, { year, month, includeCheckIns: false });
            const list = res.data?.userMetrics ?? [];
            const rows = list.map(metricsUserToRow);
            const baseName = `metrics-${year}-${String(month).padStart(2, '0')}`;
            if (exportFormat === 'csv') exportToCsv(METRICS_HEADERS, rows, baseName);
            else if (exportFormat === 'excel') exportToExcel(METRICS_HEADERS, rows, baseName);
            else exportToPdf(METRICS_HEADERS, rows, baseName);
            toast.success('Export downloaded');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Export failed';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-white border-gray-200 text-foreground gap-1.5"
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                        <DownloadIcon className="size-4" />
                    )}
                    Export
                    <ChevronDownIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <CalendarIcon className="size-4" />
                        Attendance
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-[80vh] overflow-y-auto">
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>This morning</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => runAttendanceExport(today, 'csv')}>
                                    CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => runAttendanceExport(today, 'excel')}>
                                    Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => runAttendanceExport(today, 'pdf')}>
                                    PDF
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Yesterday</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() => runAttendanceExport(subDays(today, 1), 'csv')}
                                >
                                    CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => runAttendanceExport(subDays(today, 1), 'excel')}
                                >
                                    Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => runAttendanceExport(subDays(today, 1), 'pdf')}
                                >
                                    PDF
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {showThisEvening && (
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>This evening</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                        onClick={() => runAttendanceExport(today, 'csv')}
                                    >
                                        CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => runAttendanceExport(today, 'excel')}
                                    >
                                        Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => runAttendanceExport(today, 'pdf')}
                                    >
                                        PDF
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        )}
                        <Popover open={customOpen} onOpenChange={setCustomOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                                        'focus:bg-accent focus:text-accent-foreground'
                                    )}
                                >
                                    <CalendarIcon className="size-4" />
                                    Custom date
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={customDate ?? undefined}
                                    onSelect={(d) => {
                                        setCustomDate(d ?? null);
                                        if (d) setCustomOpen(false);
                                    }}
                                />
                                {customDate && (
                                    <div className="border-t p-2 flex flex-wrap gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                runAttendanceExport(customDate, 'csv');
                                                setCustomOpen(false);
                                            }}
                                        >
                                            CSV
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                runAttendanceExport(customDate, 'excel');
                                                setCustomOpen(false);
                                            }}
                                        >
                                            Excel
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                runAttendanceExport(customDate, 'pdf');
                                                setCustomOpen(false);
                                            }}
                                        >
                                            PDF
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <BarChart3Icon className="size-4" />
                        Metrics
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Today</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() =>
                                        runMetricsExportToday(singleDate ?? today, 'csv')
                                    }
                                >
                                    CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        runMetricsExportToday(singleDate ?? today, 'excel')
                                    }
                                >
                                    Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        runMetricsExportToday(singleDate ?? today, 'pdf')
                                    }
                                >
                                    PDF
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>This month</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => runMetricsExportMonth('csv')}>
                                    CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => runMetricsExportMonth('excel')}>
                                    Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => runMetricsExportMonth('pdf')}>
                                    PDF
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
