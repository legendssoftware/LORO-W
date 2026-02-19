'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { differenceInCalendarDays, format, getDate, getDaysInMonth, isSameDay, subDays } from 'date-fns';
import {
    useTokenReady,
    useSessionSync,
    useMonthlyMetrics,
    useDailyOverview,
    useMonthlyAttendance,
    useCheckIns,
    useCheckInsReport,
    useUsers,
} from '@/api/hooks';
import type {
    DailyOverviewUser,
    MonthlyMetricsUserItem,
} from '@/api/types';
import { LoadingSpinner } from '@/components/loading-spinner';
import { CalendarIcon, ChevronDownIcon, DownloadIcon, Loader2Icon, SettingsIcon, XIcon } from '@/lib/icons';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { isStaffDashboardVisible } from '@/lib/access';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { ExportReportDropdown } from '@/app/reports/export-report-dropdown';
import type { VisitExportItem } from '@/api/types/reports';
import {
    exportVisits,
    formatContactAddress,
    formatMethodOfContact,
    visitToExportRow,
} from '@/lib/utils/visits-export';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Label,
    LabelList,
    CartesianGrid,
} from 'recharts';

const EXPECTED_MONTHLY_HOURS = 180;

/** Fallback image when visit photo upload fails or URL is broken. */
const VISIT_IMAGE_FALLBACK_URL =
    'https://images.pexels.com/photos/163194/old-retro-antique-vintage-163194.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

/**
 * Prorated expected hours by a given date: (day of month / days in month) × EXPECTED_MONTHLY_HOURS.
 * Used to show "expected by this time of month" on cards and in the detail modal.
 */
function getExpectedHoursByDate(asOfDate: Date): number {
    const day = getDate(asOfDate);
    const daysInMonth = getDaysInMonth(asOfDate);
    return Math.round((day / daysInMonth) * EXPECTED_MONTHLY_HOURS);
}

/** Shared TabsTrigger styles: purple active state, white text, equal width for all report tabs. */
const REPORTS_TAB_TRIGGER_CLASS =
    'focus-visible:ring-0 focus-visible:outline-none focus:ring-0 focus:outline-none bg-transparent text-zinc-600 data-[state=active]:!bg-purple-600 data-[state=active]:!text-white rounded-md px-3 py-1.5 border-0 data-[state=active]:shadow-none w-[7.7rem] min-w-[7.7rem] flex-shrink-0 justify-center text-sm';

type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'early';

/** Unified card item: user identity + hours + present/absent for the period. */
interface ReportCardUser {
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
}

function fromDailyOverviewMergeMonthly(
    presentUsers: DailyOverviewUser[],
    absentUsers: DailyOverviewUser[],
    monthlyByUserId: Map<number, MonthlyMetricsUserItem>
): ReportCardUser[] {
    const toCard = (u: DailyOverviewUser, present: boolean): ReportCardUser => {
        const monthly = monthlyByUserId.get(u.uid);
        const hours = monthly?.totalHours ?? 0;
        const progress = Math.min(
            100,
            Math.round((hours / EXPECTED_MONTHLY_HOURS) * 100)
        );
        return {
            userId: u.uid,
            ref: String(u.uid),
            name: u.fullName || `${u.name || ''} ${u.surname || ''}`.trim(),
            email: u.email ?? '',
            phone: u.phoneNumber ?? undefined,
            role: u.accessLevel ?? u.role,
            branch: u.branchName,
            photoURL: u.profileImage ?? undefined,
            hoursThisMonth: hours,
            progressPercent: progress,
            isPresent: present,
            earlyMinutes: present ? (u.earlyMinutes ?? 0) : undefined,
            lateMinutes: present ? (u.lateMinutes ?? 0) : undefined,
        };
    };
    const presentCards = presentUsers.map((u) => toCard(u, true));
    const absentCards = absentUsers.map((u) => toCard(u, false));
    return [...presentCards, ...absentCards];
}

/** Last 7 days ending on endDate: dots for attended/missed/future. */
function LastSevenDaysDots({
    userRef,
    endDate,
}: {
    userRef: string;
    endDate: Date;
}) {
    const year = endDate.getFullYear();
    const month = endDate.getMonth() + 1;
    const { data, isLoading } = useMonthlyAttendance(userRef, year, month, {
        enabled: !!userRef,
    });
    const sevenDays = useMemo(() => {
        if (!data?.days?.length) return [];
        const end = format(endDate, 'yyyy-MM-dd');
        const start = format(subDays(endDate, 6), 'yyyy-MM-dd');
        return data.days
            .filter((d) => d.date >= start && d.date <= end)
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [data?.days, endDate]);
    if (isLoading || sevenDays.length === 0) {
        return (
            <div className="w-full grid grid-cols-7 gap-0 items-center">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        className="size-2 rounded-full bg-muted animate-pulse justify-self-center"
                    />
                ))}
            </div>
        );
    }
    return (
        <div className="w-full grid grid-cols-7 gap-0">
            {sevenDays.map((d) => (
                <div
                    key={d.date}
                    className="flex flex-col items-center gap-0.5 justify-self-center"
                    title={`${d.date}: ${d.status}`}
                >
                    <span className="text-[10px] text-muted-foreground">
                        {format(new Date(d.date), 'EEE d')}
                    </span>
                    <div
                        className={cn(
                            'size-2.5 rounded-full shrink-0',
                            d.status === 'attended' && 'bg-green-500',
                            d.status === 'missed' && 'bg-red-500',
                            d.status === 'future' && 'bg-muted/50'
                        )}
                    />
                </div>
            ))}
        </div>
    );
}

/** Progress tier colors: <50% red, 50–<75% orange, ≥75% green. */
function getProgressColorClasses(value: number): { text: string; bg: string } {
    if (value >= 75) return { text: 'text-green-600', bg: 'bg-green-500' };
    if (value >= 50) return { text: 'text-orange-600', bg: 'bg-orange-500' };
    return { text: 'text-red-600', bg: 'bg-red-500' };
}

/** Segment state for 4-quarter progress: full (vibrant), partial (fill % within segment), or empty (pastel track). */
function getSegmentState(
    value: number,
    segmentIndex: number
): { state: 'empty' | 'partial' | 'full'; partialPercent?: number } {
    const clamped = Math.min(100, Math.max(0, value));
    const segmentStart = segmentIndex * 25;
    const segmentEnd = (segmentIndex + 1) * 25;
    if (clamped >= segmentEnd) return { state: 'full' };
    if (clamped <= segmentStart) return { state: 'empty' };
    const partialPercent = ((clamped - segmentStart) / 25) * 100;
    return { state: 'partial', partialPercent };
}

/** Four-segment progress bar: quarters of total expected (0–25%, 25–50%, 50–75%, 75–100%). Pill segments with gaps; vibrant fill + light pastel track. */
function ReportProgressBar({ value }: { value: number }) {
    const SEGMENT_COUNT = 4;
    const FILL = 'bg-orange-500';
    const TRACK = 'bg-orange-100';

    return (
        <div
            className="flex w-full gap-1.5 items-stretch"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.max(0, value))}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
                const { state, partialPercent } = getSegmentState(value, i);
                return (
                    <div
                        key={i}
                        className={cn(
                            'flex-1 h-2 rounded-full overflow-hidden min-w-0',
                            state === 'empty' && TRACK,
                            state === 'full' && FILL,
                            state === 'partial' && TRACK
                        )}
                    >
                        {state === 'partial' && partialPercent != null && (
                            <div
                                className={cn('h-full rounded-full transition-all', FILL)}
                                style={{ width: `${partialPercent}%`, minWidth: partialPercent > 0 ? 2 : 0 }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/** Chart config for present/absent pie and bar. */
const PRESENT_ABSENT_CHART_CONFIG: ChartConfig = {
    present: { label: 'Present', color: 'var(--chart-1)' },
    absent: { label: 'Absent', color: 'var(--chart-2)' },
    label: { color: 'var(--background)' },
};

/** Present vs absent – donut with center label (attendance rate). */
function PresentAbsentPieChart({
    presentCount,
    absentCount,
    attendanceRate,
}: {
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
}) {
    const data = [
        { name: 'present', value: presentCount, fill: 'var(--color-present)' },
        { name: 'absent', value: absentCount, fill: 'var(--color-absent)' },
    ].filter((d) => d.value > 0);

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Attendance – Present vs Absent</CardTitle>
                <CardDescription>Today&apos;s present vs absent</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No attendance data for today.
                    </p>
                ) : (
                    <ChartContainer
                        config={PRESENT_ABSENT_CHART_CONFIG}
                        className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
                    >
                        <RechartsPieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                strokeWidth={5}
                                cornerRadius={6}
                                paddingAngle={2}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                <Label
                                    content={({ viewBox }) => {
                                        if (
                                            viewBox &&
                                            'cx' in viewBox &&
                                            'cy' in viewBox
                                        ) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-3xl font-bold"
                                                    >
                                                        {attendanceRate}%
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy ?? 0) + 24}
                                                        className="fill-muted-foreground"
                                                    >
                                                        Attendance rate
                                                    </tspan>
                                                </text>
                                            );
                                        }
                                    }}
                                />
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </RechartsPieChart>
                    </ChartContainer>
                )}
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="text-muted-foreground leading-none">
                    Today&apos;s attendance
                </div>
            </CardFooter>
        </Card>
    );
}

/** Chart config for late vs on-time. */
const LATE_ON_TIME_CHART_CONFIG: ChartConfig = {
    late: { label: 'Late', color: 'var(--chart-1)' },
    onTime: { label: 'On-time', color: 'var(--chart-2)' },
    label: { color: 'var(--background)' },
};

/** Users – Late vs On-time vertical bar chart. */
function LateVsOnTimeBarChart({
    lateCount,
    onTimeCount,
}: {
    lateCount: number;
    onTimeCount: number;
}) {
    const data = [
        { name: 'Late', count: lateCount, fill: 'var(--color-late)' },
        { name: 'On-time', count: onTimeCount, fill: 'var(--color-onTime)' },
    ];
    return (
        <Card>
            <CardHeader>
                <CardTitle>Users – Late vs On-time</CardTitle>
                <CardDescription>Today</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={LATE_ON_TIME_CHART_CONFIG}
                    className="aspect-auto h-[200px] sm:h-[250px] w-full"
                >
                    <RechartsBarChart
                        accessibilityLayer
                        data={data}
                        layout="vertical"
                        margin={{ right: 16 }}
                    >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(v) => v}
                            hide
                        />
                        <XAxis dataKey="count" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent indicator="line" />
                            }
                        />
                        <Bar
                            dataKey="count"
                            layout="vertical"
                            radius={4}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList
                                dataKey="name"
                                position="insideLeft"
                                offset={8}
                                className="fill-(--color-label)"
                                fontSize={12}
                            />
                            <LabelList
                                dataKey="count"
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                        <ChartLegend
                            content={
                                <ChartLegendContent
                                    nameKey="name"
                                    payload={[
                                        {
                                            value: 'Late',
                                            dataKey: 'late',
                                            color: 'var(--color-late)',
                                        },
                                        {
                                            value: 'On-time',
                                            dataKey: 'onTime',
                                            color: 'var(--color-onTime)',
                                        },
                                    ]}
                                />
                            }
                        />
                    </RechartsBarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="text-muted-foreground leading-none">
                    Today&apos;s attendance
                </div>
            </CardFooter>
        </Card>
    );
}

/** Chart config for hours target top 5. */
const HOURS_TOP5_CHART_CONFIG: ChartConfig = {
    hours: { label: 'Hours', color: 'var(--chart-1)' },
    label: { color: 'var(--background)' },
};

/** Hours target (180h) – top 5 users by hours (vertical bar). */
function HoursTargetTop5Chart({
    userMetrics,
}: {
    userMetrics: MonthlyMetricsUserItem[];
}) {
    const data = useMemo(() => {
        const sorted = [...userMetrics].sort((a, b) => b.totalHours - a.totalHours);
        return sorted.slice(0, 5).map((u) => ({
            name: u.userName.length > 20 ? `${u.userName.slice(0, 17)}…` : u.userName,
            hours: Math.round(u.totalHours * 10) / 10,
            fill: 'var(--color-hours)',
        }));
    }, [userMetrics]);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Hours target ({EXPECTED_MONTHLY_HOURS}h)</CardTitle>
                    <CardDescription>Top 5 by hours this month</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No monthly metrics yet.
                    </p>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm">
                    <div className="text-muted-foreground leading-none">
                        Hours target this month
                    </div>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Hours target ({EXPECTED_MONTHLY_HOURS}h)</CardTitle>
                <CardDescription>Top 5 by hours this month</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={HOURS_TOP5_CHART_CONFIG}
                    className="aspect-auto h-[200px] sm:h-[250px] w-full"
                >
                    <RechartsBarChart
                        accessibilityLayer
                        data={data}
                        layout="vertical"
                        margin={{ right: 16 }}
                    >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            width={100}
                            tick={{ fontSize: 11 }}
                        />
                        <XAxis dataKey="hours" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent nameKey="name" />}
                        />
                        <Bar dataKey="hours" layout="vertical" radius={4} fill="var(--color-hours)">
                            <LabelList
                                dataKey="hours"
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={12}
                                formatter={(v: number) => `${v}h`}
                            />
                        </Bar>
                    </RechartsBarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="text-muted-foreground leading-none">
                    Hours target this month
                </div>
            </CardFooter>
        </Card>
    );
}

/** Chart config for overtime vs regular. */
const OVERTIME_CHART_CONFIG: ChartConfig = {
    regular: { label: 'Regular hours', color: 'var(--chart-1)' },
    overtime: { label: 'Overtime hours', color: 'var(--chart-2)' },
};

/** Donut – overtime vs regular hours (monthly summary). */
function OvertimeVsRegularPieChart({
    totalHours,
    totalOvertimeHours,
}: {
    totalHours: number;
    totalOvertimeHours: number;
}) {
    const regularHours = Math.max(0, totalHours - totalOvertimeHours);
    const data = [
        { name: 'regular', value: regularHours, fill: 'var(--color-regular)' },
        { name: 'overtime', value: totalOvertimeHours, fill: 'var(--color-overtime)' },
    ].filter((d) => d.value > 0);
    const total = totalHours;

    if (data.length === 0) {
        return (
            <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Hours – Regular vs Overtime</CardTitle>
                    <CardDescription>This month</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No hours data this month.
                    </p>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm">
                    <div className="text-muted-foreground leading-none">
                        This month&apos;s hours
                    </div>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Hours – Regular vs Overtime</CardTitle>
                <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={OVERTIME_CHART_CONFIG}
                    className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
                >
                    <RechartsPieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            strokeWidth={5}
                            cornerRadius={6}
                            paddingAngle={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <Label
                                content={({ viewBox }) => {
                                    if (
                                        viewBox &&
                                        'cx' in viewBox &&
                                        'cy' in viewBox
                                    ) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {total.toLocaleString()}h
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy ?? 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    Total hours
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </RechartsPieChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="text-muted-foreground leading-none">
                    This month&apos;s hours
                </div>
            </CardFooter>
        </Card>
    );
}

/** Props for the shared attendance charts section (Present/Absent, Late/On-time, Hours top 5, Regular/Overtime). */
export interface AttendanceChartsSectionProps {
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
    lateCount: number;
    onTimeCount: number;
    userMetrics: MonthlyMetricsUserItem[];
    totalHours: number;
    totalOvertimeHours: number;
    chartsLoading?: boolean;
}

/** Reusable 4-chart grid: Present vs Absent, Late vs On-time, Hours target top 5, Regular vs Overtime. */
function AttendanceChartsSection({
    presentCount,
    absentCount,
    attendanceRate,
    lateCount,
    onTimeCount,
    userMetrics,
    totalHours,
    totalOvertimeHours,
    chartsLoading = false,
}: AttendanceChartsSectionProps) {
    if (chartsLoading) {
        return (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-28 mt-1" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[200px] sm:h-[250px] w-full rounded-md" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }
    return (
        <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <PresentAbsentPieChart
                presentCount={presentCount}
                absentCount={absentCount}
                attendanceRate={attendanceRate}
            />
            <LateVsOnTimeBarChart lateCount={lateCount} onTimeCount={onTimeCount} />
            <HoursTargetTop5Chart userMetrics={userMetrics} />
            <OvertimeVsRegularPieChart
                totalHours={totalHours}
                totalOvertimeHours={totalOvertimeHours}
            />
        </div>
    );
}

/** Live tab: today’s attendance + current month hours, charts from metrics response. */
function LiveReportTab({ isTokenReady }: { isTokenReady: boolean }) {
    const [mounted, setMounted] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [liveVisitsAllTime, setLiveVisitsAllTime] = useState(false);
    useEffect(() => setMounted(true), []);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const dailyQuery = useDailyOverview(
        { date: todayStr },
        { enabled: mounted && isTokenReady }
    );
    const monthlyQuery = useMonthlyMetrics(
        { year, month, includeCheckIns: false },
        { enabled: mounted && isTokenReady }
    );

    const presentCount = dailyQuery.data?.data?.presentEmployees ?? 0;
    const absentCount = dailyQuery.data?.data?.absentEmployees ?? 0;
    const attendanceRate = dailyQuery.data?.data?.attendanceRate ?? 0;

    const { reachedHoursCount, notReachedHoursCount } = useMemo(() => {
        const list = monthlyQuery.data?.data?.userMetrics ?? [];
        const reached = list.filter((u) => u.totalHours >= EXPECTED_MONTHLY_HOURS).length;
        return {
            reachedHoursCount: reached,
            notReachedHoursCount: list.length - reached,
        };
    }, [monthlyQuery.data]);

    const { totalHours, totalOvertimeHours } = useMemo(() => {
        const summary = monthlyQuery.data?.data?.summary;
        return {
            totalHours: summary?.totalHours ?? 0,
            totalOvertimeHours: summary?.totalOvertimeHours ?? 0,
        };
    }, [monthlyQuery.data]);

    const { lateCount, onTimeCount } = useMemo(() => {
        const present = dailyQuery.data?.data?.presentUsers ?? [];
        const late = present.filter((u) => (u.lateMinutes ?? 0) > 0).length;
        return {
            lateCount: late,
            onTimeCount: present.length - late,
        };
    }, [dailyQuery.data?.data?.presentUsers]);

    const isLoading = dailyQuery.isLoading || monthlyQuery.isLoading;

    const visitsStartStr = format(subDays(today, 30), 'yyyy-MM-dd');
    const visitsEndStr = format(today, 'yyyy-MM-dd');
    const reportStartStr = liveVisitsAllTime ? format(subDays(today, 365), 'yyyy-MM-dd') : visitsStartStr;
    const reportEndStr = liveVisitsAllTime ? visitsEndStr : visitsEndStr;
    const checkInsQuery = useCheckIns(
        liveVisitsAllTime ? {} : { startDate: visitsStartStr, endDate: visitsEndStr },
        { enabled: mounted && isTokenReady }
    );
    const reportQuery = useCheckInsReport(
        { from: reportStartStr, to: reportEndStr },
        { enabled: mounted && isTokenReady }
    );
    const checkIns: VisitExportItem[] = checkInsQuery.data?.checkIns ?? [];

    const handleVisitsExport = (exportFormat: 'csv' | 'excel' | 'pdf') => {
        if (checkIns.length === 0) {
            toast.error('No visits to export');
            return;
        }
        setExportLoading(true);
        const baseName = liveVisitsAllTime ? 'visits-all-time' : `visits-${visitsStartStr}-${visitsEndStr}`;
        try {
            exportVisits(checkIns, exportFormat, baseName);
            toast.success('Export downloaded');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Export failed');
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Today ({format(today, 'PPP')}) · Attendance rate: <strong>{attendanceRate}%</strong>
                </p>
                <ExportReportDropdown singleDate={today} />
            </div>
            <AttendanceChartsSection
                presentCount={presentCount}
                absentCount={absentCount}
                attendanceRate={attendanceRate}
                lateCount={lateCount}
                onTimeCount={onTimeCount}
                userMetrics={monthlyQuery.data?.data?.userMetrics ?? []}
                totalHours={totalHours}
                totalOvertimeHours={totalOvertimeHours}
                chartsLoading={isLoading}
            />

            <Separator className="my-6" />

            <section className="pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <p className="text-sm text-muted-foreground">
                        {liveVisitsAllTime ? 'All time' : 'Last 30 days'} · Total visits:{' '}
                        <strong>{(reportQuery.data?.total ?? checkIns.length).toLocaleString()}</strong>
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 ml-2 text-muted-foreground"
                            onClick={() => setLiveVisitsAllTime((v) => !v)}
                        >
                            {liveVisitsAllTime ? 'Show last 30 days' : 'Show all time'}
                        </Button>
                    </p>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 bg-white border-gray-200 text-foreground gap-1.5"
                                disabled={exportLoading || checkIns.length === 0}
                            >
                                {exportLoading ? (
                                    <Loader2Icon className="size-4 animate-spin" />
                                ) : (
                                    <DownloadIcon className="size-4" />
                                )}
                                Export
                                <ChevronDownIcon className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuItem onClick={() => handleVisitsExport('csv')}>
                                CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVisitsExport('excel')}>
                                Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVisitsExport('pdf')}>
                                PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <VisitsChartsSection
                    checkIns={checkIns}
                    reportTotal={reportQuery.data?.total}
                    reportLoading={reportQuery.isLoading}
                />
            </section>
        </div>
    );
}

/** Chart config for visits by method. */
const VISITS_METHOD_CHART_CONFIG: ChartConfig = {
    count: { label: 'Visits', color: 'var(--chart-1)' },
    ...['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'].reduce(
        (acc, color, i) => ({ ...acc, [`method_${i}`]: { label: `Method ${i + 1}`, color } }),
        {} as ChartConfig
    ),
};

/** Chart config for visits by day / by user. */
const VISITS_COUNT_CHART_CONFIG: ChartConfig = {
    count: { label: 'Visits', color: 'var(--chart-1)' },
};

/** Parse duration string "Xh Ym" to total minutes. */
function parseDurationToMinutes(duration: string | null | undefined): number {
    if (!duration || typeof duration !== 'string') return 0;
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)m/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    return hours * 60 + minutes;
}

/** Format minutes as "Xh Ym". */
function formatMinutesToDuration(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Format minutes for display: always "Xh Ym" (e.g. "0h 9m"). */
function formatDurationDisplay(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
}

/** Normalize duration string to display "Xh Ym"; returns '-' if missing. */
function normalizeDurationDisplay(duration: string | null | undefined): string {
    if (duration == null || duration === '') return '-';
    const mins = parseDurationToMinutes(duration);
    return formatDurationDisplay(mins);
}

/** Extract region string from a visit (for charts and region filter). */
function extractRegionFromVisit(c: VisitExportItem): string {
    const addr = c.fullAddress ?? c.checkOutFullAddress ?? c.contactAddress;
    if (!addr) return 'Not set';
    const cityOrRegion = (addr.city ?? addr.state ?? '').trim();
    const postalCode = addr.postalCode?.trim() ?? '';
    const country = (addr.country ?? '').trim();
    const fromStructured = [cityOrRegion, postalCode, country].filter(Boolean).join(', ');
    if (fromStructured) return fromStructured;
    const formatted = (addr.formattedAddress ?? '').trim();
    if (!formatted) return 'Not set';
    const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return 'Not set';
    const secondLast = parts[parts.length - 2];
    const codePart = /^\d{4,5}$/.test(secondLast) ? secondLast : '';
    const cityPart = codePart ? parts[parts.length - 3] ?? '' : secondLast;
    const countryPart = parts[parts.length - 1];
    return [cityPart, codePart, countryPart].filter(Boolean).join(', ') || 'Not set';
}

/** Four charts: Methods of visits, Visits by user, Visits by region, Visit duration by user. */
function VisitsChartsSection({
    checkIns,
    reportTotal,
    reportLoading,
}: {
    checkIns: VisitExportItem[];
    reportTotal?: number;
    reportLoading: boolean;
}) {
    const totalVisits = reportTotal ?? checkIns.length;
    const VISITS_CHART_TOP_N = 5;

    const byMethodData = useMemo(() => {
        const map = new Map<string, number>();
        for (const c of checkIns) {
            const key = c.methodOfContact || 'Not set';
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
        return Array.from(map.entries()).map(([name, value], i) => ({
            name,
            value,
            fill: colors[i % colors.length],
        }));
    }, [checkIns]);

    const byUserData = useMemo(() => {
        const map = new Map<string, number>();
        for (const c of checkIns) {
            const name =
                c.owner?.name != null
                    ? [c.owner.name, (c.owner as { surname?: string }).surname].filter(Boolean).join(' ').trim()
                    : 'Unknown';
            const displayName = name.length > 18 ? `${name.slice(0, 15)}…` : name;
            map.set(displayName, (map.get(displayName) ?? 0) + 1);
        }
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, VISITS_CHART_TOP_N)
            .map(([name, count]) => ({ name, count, fill: 'var(--color-count)' }));
    }, [checkIns]);

    const byRegionData = useMemo(() => {
        const map = new Map<string, number>();
        for (const c of checkIns) {
            const region = extractRegionFromVisit(c);
            map.set(region, (map.get(region) ?? 0) + 1);
        }
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, VISITS_CHART_TOP_N)
            .map(([name, count]) => ({ name, count, fill: 'var(--color-count)' }));
    }, [checkIns]);

    const durationByUserData = useMemo(() => {
        const totalMap = new Map<string, number>();
        const countMap = new Map<string, number>();
        for (const c of checkIns) {
            const mins = parseDurationToMinutes(c.duration);
            if (mins <= 0) continue;
            const name =
                c.owner?.name != null
                    ? [c.owner.name, (c.owner as { surname?: string }).surname].filter(Boolean).join(' ').trim()
                    : 'Unknown';
            const displayName = name.length > 18 ? `${name.slice(0, 15)}…` : name;
            totalMap.set(displayName, (totalMap.get(displayName) ?? 0) + mins);
            countMap.set(displayName, (countMap.get(displayName) ?? 0) + 1);
        }
        return Array.from(totalMap.entries())
            .map(([name, totalMinutes]) => {
                const visitCount = countMap.get(name) ?? 1;
                const averageMinutes = Math.round(totalMinutes / visitCount);
                return { name, averageMinutes, visitCount };
            })
            .filter(({ averageMinutes }) => averageMinutes > 0)
            .sort((a, b) => b.averageMinutes - a.averageMinutes)
            .slice(0, VISITS_CHART_TOP_N)
            .map(({ name, averageMinutes }) => ({
                name,
                averageMinutes,
                displayDuration: formatMinutesToDuration(averageMinutes),
                fill: 'var(--color-count)',
            }));
    }, [checkIns]);

    if (reportLoading && checkIns.length === 0) {
        return (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24 mt-1" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[200px] sm:h-[250px] w-full rounded-md" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {/* 1. Methods of visits – donut with total in center */}
            <Card>
                <CardHeader>
                    <CardTitle>Methods of visits</CardTitle>
                    <CardDescription>Total visits in center</CardDescription>
                </CardHeader>
                <CardContent>
                    {byMethodData.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
                    ) : (
                        <ChartContainer
                            config={VISITS_METHOD_CHART_CONFIG}
                            className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
                        >
                            <RechartsPieChart>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Pie
                                    data={byMethodData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={60}
                                    strokeWidth={5}
                                    cornerRadius={6}
                                    paddingAngle={2}
                                >
                                    {byMethodData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                    <Label
                                        content={({ viewBox }) => {
                                            if (
                                                viewBox &&
                                                'cx' in viewBox &&
                                                'cy' in viewBox
                                            ) {
                                                return (
                                                    <text
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                    >
                                                        <tspan
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                            className="fill-foreground text-3xl font-bold"
                                                        >
                                                            {totalVisits.toLocaleString()}
                                                        </tspan>
                                                        <tspan
                                                            x={viewBox.cx}
                                                            y={(viewBox.cy ?? 0) + 24}
                                                            className="fill-muted-foreground"
                                                        >
                                                            Visits
                                                        </tspan>
                                                    </text>
                                                );
                                            }
                                        }}
                                    />
                                </Pie>
                                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                            </RechartsPieChart>
                        </ChartContainer>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="text-muted-foreground leading-none">Contact method</div>
                </CardFooter>
            </Card>

            {/* 2. Visits by user */}
            <Card>
                <CardHeader>
                    <CardTitle>Visits by user</CardTitle>
                    <CardDescription>Top {VISITS_CHART_TOP_N} users</CardDescription>
                </CardHeader>
                <CardContent>
                    {byUserData.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
                    ) : (
                        <ChartContainer
                            config={VISITS_COUNT_CHART_CONFIG}
                            className="aspect-auto h-[200px] sm:h-[250px] w-full"
                        >
                            <RechartsBarChart
                                accessibilityLayer
                                data={byUserData}
                                layout="vertical"
                                margin={{ right: 16 }}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    width={100}
                                    tick={{ fontSize: 11 }}
                                />
                                <XAxis dataKey="count" type="number" hide />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                                <Bar dataKey="count" layout="vertical" radius={4} fill="var(--color-count)">
                                    <LabelList
                                        dataKey="count"
                                        position="right"
                                        offset={8}
                                        className="fill-foreground"
                                        fontSize={12}
                                    />
                                </Bar>
                            </RechartsBarChart>
                        </ChartContainer>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="text-muted-foreground leading-none">Visits per user</div>
                </CardFooter>
            </Card>

            {/* 3. Visits by region */}
            <Card>
                <CardHeader>
                    <CardTitle>Visits by region</CardTitle>
                    <CardDescription>Top {VISITS_CHART_TOP_N} regions</CardDescription>
                </CardHeader>
                <CardContent>
                    {byRegionData.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
                    ) : (
                        <ChartContainer
                            config={VISITS_COUNT_CHART_CONFIG}
                            className="aspect-auto h-[200px] sm:h-[250px] w-full"
                        >
                            <RechartsBarChart
                                accessibilityLayer
                                data={byRegionData}
                                layout="vertical"
                                margin={{ right: 16 }}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    width={100}
                                    tick={{ fontSize: 11 }}
                                />
                                <XAxis dataKey="count" type="number" hide />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                                <Bar dataKey="count" layout="vertical" radius={4} fill="var(--color-count)">
                                    <LabelList
                                        dataKey="count"
                                        position="right"
                                        offset={8}
                                        className="fill-foreground"
                                        fontSize={12}
                                    />
                                </Bar>
                            </RechartsBarChart>
                        </ChartContainer>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="text-muted-foreground leading-none">Visits per region</div>
                </CardFooter>
            </Card>

            {/* 4. Visit duration by user */}
            <Card>
                <CardHeader>
                    <CardTitle>Visit duration by user</CardTitle>
                    <CardDescription>Top {VISITS_CHART_TOP_N} by average duration</CardDescription>
                </CardHeader>
                <CardContent>
                    {durationByUserData.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
                    ) : (
                        <ChartContainer
                            config={VISITS_COUNT_CHART_CONFIG}
                            className="aspect-auto h-[200px] sm:h-[250px] w-full"
                        >
                            <RechartsBarChart
                                accessibilityLayer
                                data={durationByUserData}
                                layout="vertical"
                                margin={{ right: 16 }}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    width={100}
                                    tick={{ fontSize: 11 }}
                                />
                                <XAxis dataKey="averageMinutes" type="number" hide />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            nameKey="name"
                                            formatter={(value, _name, _item, _index, payload) => [
                                                (payload as { displayDuration?: string } | undefined)?.displayDuration ?? formatMinutesToDuration(Number(value)),
                                                'Duration',
                                            ]}
                                        />
                                    }
                                />
                                <Bar dataKey="averageMinutes" layout="vertical" radius={4} fill="var(--color-count)">
                                    <LabelList
                                        dataKey="displayDuration"
                                        position="right"
                                        offset={8}
                                        className="fill-foreground"
                                        fontSize={12}
                                    />
                                </Bar>
                            </RechartsBarChart>
                        </ChartContainer>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="text-muted-foreground leading-none">Average visit duration per user</div>
                </CardFooter>
            </Card>
        </div>
    );
}

/** True if string looks like "lat,lng" coordinates. */
function isCoordLike(s: string): boolean {
  const t = s.trim();
  return /^-?\d{1,3}\.?\d*\s*,\s*-?\d{1,3}\.?\d*$/.test(t);
}

/** Google Maps URL for coordinates or address search. */
function buildMapsUrl(location: string): string {
  const t = location.trim();
  if (!t || t === '-') return '#';
  if (isCoordLike(t)) return `https://www.google.com/maps?q=${encodeURIComponent(t)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`;
}

/** tel: URL for phone numbers (strip spaces/dashes). */
function buildTelUrl(phone: string): string {
  const normalized = phone.replace(/[\s\-()]/g, '');
  return `tel:${normalized}`;
}

const VISITS_TABLE_LINK_CLASS = 'text-primary underline hover:opacity-80';

/** Format address for display; falls back to raw string when no address. */
function formatAddressForDisplay(
    address?: { formattedAddress?: string; street?: string; suburb?: string; city?: string; state?: string; country?: string; postalCode?: string } | null,
    fallback?: string
): string {
    if (!address) return fallback ?? '-';
    if (address.formattedAddress) return address.formattedAddress;
    const parts = [
        (address as { streetNumber?: string }).streetNumber,
        address.street,
        address.suburb,
        address.city,
        address.state,
        address.country,
        address.postalCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback ?? '-';
}

/** tel: URL for phone numbers (strip spaces/dashes). */
function buildTelUrlSafe(phone: string | null | undefined): string {
    if (!phone || typeof phone !== 'string') return '#';
    const normalized = phone.replace(/[\s\-()]/g, '');
    return normalized ? `tel:${normalized}` : '#';
}

/** Visit Detail Dialog: full check-in data including images. */
function VisitDetailDialog({
    visit,
    open,
    onOpenChange,
}: {
    visit: VisitExportItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!visit) return null;
    const ownerFullName = visit.owner ? [visit.owner.name, visit.owner.surname].filter(Boolean).join(' ').trim() : '-';
    const inAddr = formatAddressForDisplay(visit.fullAddress, visit.checkInLocation || '-');
    const outAddr = formatAddressForDisplay(visit.checkOutFullAddress, visit.checkOutLocation || '-');
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Visit Details – #{visit.uid}</DialogTitle>
                    <DialogDescription>
                        {ownerFullName} · {format(new Date(visit.checkInTime), 'MMM d, yyyy')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    {/* Timing */}
                    <div>
                        <h4 className="font-semibold mb-2">Timing</h4>
                        <div className="space-y-1 text-muted-foreground">
                            <p>Check-in: {format(new Date(visit.checkInTime), 'MMM d, yyyy – h:mm a')}</p>
                            {visit.checkOutTime && (
                                <p>Check-out: {format(new Date(visit.checkOutTime), 'MMM d, yyyy – h:mm a')}</p>
                            )}
                            {visit.duration && <p>Duration: {normalizeDurationDisplay(visit.duration)}</p>}
                        </div>
                    </div>
                    <Separator />
                    {/* Location */}
                    <div>
                        <h4 className="font-semibold mb-2">Location</h4>
                        <div className="space-y-1">
                            <p>
                                In:{' '}
                                {inAddr !== '#' ? (
                                    <a
                                        href={buildMapsUrl(visit.checkInLocation || inAddr)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={VISITS_TABLE_LINK_CLASS}
                                    >
                                        {inAddr}
                                    </a>
                                ) : (
                                    inAddr
                                )}
                            </p>
                            {(visit.checkOutLocation || outAddr !== '-') && (
                                <p>
                                    Out:{' '}
                                    {outAddr !== '-' && outAddr !== '#' ? (
                                        <a
                                            href={buildMapsUrl(visit.checkOutLocation || outAddr)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={VISITS_TABLE_LINK_CLASS}
                                        >
                                            {outAddr}
                                        </a>
                                    ) : (
                                        outAddr
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Photos */}
                    {(visit.checkInPhoto || visit.checkOutPhoto || visit.contactImage) && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Photos</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {visit.checkInPhoto && (
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-1">Check-in photo</p>
                                            <img
                                                src={visit.checkInPhoto}
                                                alt="Check-in"
                                                className="rounded-lg border w-full max-h-48 object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                                                }}
                                            />
                                        </div>
                                    )}
                                    {visit.checkOutPhoto && (
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-1">Check-out photo</p>
                                            <img
                                                src={visit.checkOutPhoto}
                                                alt="Check-out"
                                                className="rounded-lg border w-full max-h-48 object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                                                }}
                                            />
                                        </div>
                                    )}
                                    {visit.contactImage && (
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-1">Contact photo</p>
                                            <img
                                                src={visit.contactImage}
                                                alt="Contact"
                                                className="rounded-lg border w-full max-h-48 object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    {/* Contact */}
                    {(visit.contactFullName || visit.contactCellPhone || visit.contactLandline || visit.contactEmail || formatContactAddress(visit.contactAddress) !== '-') && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Contact</h4>
                                <div className="space-y-1">
                                    {visit.contactFullName && <p>{visit.contactFullName}</p>}
                                    {visit.personSeenPosition && <p className="text-muted-foreground">{visit.personSeenPosition}</p>}
                                    {visit.contactCellPhone && (
                                        <p>
                                            <a href={buildTelUrlSafe(visit.contactCellPhone)} className={VISITS_TABLE_LINK_CLASS}>
                                                {visit.contactCellPhone}
                                            </a>
                                        </p>
                                    )}
                                    {visit.contactLandline && (
                                        <p>
                                            <a href={buildTelUrlSafe(visit.contactLandline)} className={VISITS_TABLE_LINK_CLASS}>
                                                {visit.contactLandline}
                                            </a>
                                        </p>
                                    )}
                                    {visit.contactEmail && (
                                        <p>
                                            <a href={`mailto:${visit.contactEmail}`} className={VISITS_TABLE_LINK_CLASS}>
                                                {visit.contactEmail}
                                            </a>
                                        </p>
                                    )}
                                    {visit.contactAddress && formatContactAddress(visit.contactAddress) !== '-' && (
                                        <p>
                                            <a
                                                href={buildMapsUrl(formatContactAddress(visit.contactAddress) || '')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={VISITS_TABLE_LINK_CLASS}
                                            >
                                                {formatContactAddress(visit.contactAddress)}
                                            </a>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    {/* Company */}
                    {(visit.companyName || visit.businessType || visit.meetingLink) && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Company & Business</h4>
                                <div className="space-y-1">
                                    {visit.companyName && <p>{visit.companyName}</p>}
                                    {visit.businessType && (
                                        <p className="text-muted-foreground">{String(visit.businessType).replace(/_/g, ' ')}</p>
                                    )}
                                    {visit.meetingLink && (
                                        <p>
                                            <a
                                                href={visit.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={VISITS_TABLE_LINK_CLASS}
                                            >
                                                {visit.followUp || 'Open meeting link'}
                                            </a>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    {/* Enhancement fields */}
                    {(visit.methodOfContact || visit.buildingType || visit.contactMade != null) && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Visit Details</h4>
                                <div className="space-y-1">
                                    {visit.methodOfContact && <p>Method: {formatMethodOfContact(visit.methodOfContact)}</p>}
                                    {visit.buildingType && <p>Building type: {visit.buildingType.replace(/_/g, ' ')}</p>}
                                    {visit.contactMade != null && <p>Contact made: {visit.contactMade ? 'Yes' : 'No'}</p>}
                                </div>
                            </div>
                        </>
                    )}
                    {/* Sales */}
                    {(visit.salesValue != null || visit.quotationNumber || visit.quotationStatus) && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Sales</h4>
                                <div className="space-y-1">
                                    {visit.salesValue != null && (
                                        <p>
                                            R {Number(visit.salesValue).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (ex VAT)
                                        </p>
                                    )}
                                    {visit.quotationNumber && <p>Quotation: {visit.quotationNumber}</p>}
                                    {visit.quotationStatus && (
                                        <p className="text-muted-foreground">{String(visit.quotationStatus).replace(/_/g, ' ')}</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    {/* Lead */}
                    {visit.lead && (visit.lead.name || visit.lead.uid) && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Lead</h4>
                                <p>{visit.lead.name || `#${visit.lead.uid}`}</p>
                                {visit.lead.status && <p className="text-muted-foreground">{visit.lead.status}</p>}
                            </div>
                        </>
                    )}
                    {/* Notes / Resolution / Follow-up */}
                    {(visit.notes || visit.resolution || visit.followUp) && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Notes & Follow-up</h4>
                                <div className="space-y-2">
                                    {visit.notes && (
                                        <div>
                                            <p className="text-muted-foreground text-xs">Notes</p>
                                            <p className="whitespace-pre-wrap">{visit.notes}</p>
                                        </div>
                                    )}
                                    {visit.resolution && (
                                        <div>
                                            <p className="text-muted-foreground text-xs">Resolution</p>
                                            <p className="whitespace-pre-wrap">{visit.resolution}</p>
                                        </div>
                                    )}
                                    {visit.followUp && !visit.meetingLink && (
                                        <div>
                                            <p className="text-muted-foreground text-xs">Follow-up</p>
                                            <p className="whitespace-pre-wrap">{visit.followUp}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface VisitsDisplayColumn {
  key: string;
  label: string;
  render: (c: VisitExportItem) => ReactNode;
}

const VISITS_DISPLAY_COLUMNS: VisitsDisplayColumn[] = [
  {
    key: 'salesPerson',
    label: 'Sales Person',
    render: (c) => {
      const o = c.owner;
      if (!o) return '-';
      const fullName = [o.name, o.surname].filter(Boolean).join(' ').trim() || '-';
      const imgSrc = o.photoURL ?? o.avatar ?? undefined;
      return (
        <span className="flex items-start gap-2 whitespace-normal">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={imgSrc} alt={fullName} />
            <AvatarFallback className="text-xs">
              {fullName !== '-' ? fullName.slice(0, 2).toUpperCase() : '-'}
            </AvatarFallback>
          </Avatar>
          <span className="space-y-0.5 block min-w-0">
            <span className="block font-medium">{fullName}</span>
            {o.email && (
              <a
                href={`mailto:${o.email}`}
                className={cn('block text-xs truncate', VISITS_TABLE_LINK_CLASS)}
                title={o.email}
              >
                {o.email}
              </a>
            )}
            {o.phone && (
              <a
                href={buildTelUrl(o.phone)}
                className={cn('block text-xs', VISITS_TABLE_LINK_CLASS)}
              >
                {o.phone}
              </a>
            )}
            {!o.email && !o.phone && (
              <span className="block text-xs text-muted-foreground">-</span>
            )}
          </span>
        </span>
      );
    },
  },
  {
    key: 'date',
    label: 'Date and time',
    render: (c) => {
      const dateLine = format(new Date(c.checkInTime), 'MMM d, yyyy,');
      const inTime = format(new Date(c.checkInTime), 'HH:mm');
      const outTime = c.checkOutTime ? format(new Date(c.checkOutTime), 'HH:mm') : '-';
      const timeLine = `${inTime} – ${outTime}`;
      const durationLine = normalizeDurationDisplay(c.duration);
      return (
        <span className="whitespace-normal block">
          <span className="block">{dateLine}</span>
          <span className="block">{timeLine}</span>
          <span className="block text-muted-foreground text-xs">{durationLine}</span>
        </span>
      );
    },
  },
  {
    key: 'checkIn',
    label: 'Check-In',
    render: (c) => {
      const inAddr = formatAddressForDisplay(c.fullAddress, c.checkInLocation || '-');
      const outAddr = formatAddressForDisplay(c.checkOutFullAddress, c.checkOutLocation || '-');
      const inMapTarget = c.checkInLocation || inAddr;
      const outMapTarget = c.checkOutLocation || outAddr;
      const inUrl = inMapTarget !== '-' ? buildMapsUrl(inMapTarget) : null;
      const outUrl = outMapTarget !== '-' ? buildMapsUrl(outMapTarget) : null;
      const locRowClass = 'flex min-w-0 gap-1 items-start';
      const locValueClass = 'min-w-0 overflow-hidden text-ellipsis';
      const locLinkClass = cn(VISITS_TABLE_LINK_CLASS, 'block truncate text-left');
      return (
        <span className="space-y-1 block max-w-[14rem]">
          <span className={locRowClass}>
            <span className="text-muted-foreground shrink-0">In: </span>
            <span
              className={locValueClass}
              title={inAddr !== '-' ? inAddr : undefined}
            >
              {inUrl && inUrl !== '#' ? (
                <a href={inUrl} target="_blank" rel="noopener noreferrer" className={locLinkClass} title={inAddr}>
                  {inAddr}
                </a>
              ) : (
                <span className="block truncate">{inAddr}</span>
              )}
            </span>
          </span>
          <span className={locRowClass}>
            <span className="text-muted-foreground shrink-0">Out: </span>
            <span
              className={locValueClass}
              title={outAddr !== '-' ? outAddr : undefined}
            >
              {outUrl && outUrl !== '#' ? (
                <a href={outUrl} target="_blank" rel="noopener noreferrer" className={locLinkClass} title={outAddr}>
                  {outAddr}
                </a>
              ) : (
                <span className="block truncate">{outAddr}</span>
              )}
            </span>
          </span>
        </span>
      );
    },
  },
  {
    key: 'method',
    label: 'Method',
    render: (c) => {
      if (c.methodOfContact) return formatMethodOfContact(c.methodOfContact);
      const hasLocation =
        (c.checkInLocation && c.checkInLocation !== '-') ||
        (c.checkOutLocation && c.checkOutLocation !== '-');
      return hasLocation ? 'In-person visit' : '-';
    },
  },
  {
    key: 'companyAndContact',
    label: 'Company / Contact',
    render: (c) => {
      const blocks: ReactNode[] = [];

      if (c.companyName?.trim()) {
        const type = c.businessType ? String(c.businessType).replace(/_/g, ' ') : null;
        blocks.push(
          <span key="company" className="block">
            <span className="font-medium">{c.companyName.trim()}</span>
            {type && <span className="block text-xs text-muted-foreground">{type}</span>}
          </span>
        );
      }

      const contactName = c.contactFullName?.trim();
      const position = c.personSeenPosition?.trim();
      if (contactName || position) {
        blocks.push(
          <span key="contact" className="block">
            {contactName && (
              <>
                <span className="text-muted-foreground">Contact person: </span>
                {contactName}
              </>
            )}
            {position && <span className="block text-xs text-muted-foreground">{position}</span>}
          </span>
        );
      }

      if (c.contactCellPhone?.trim()) {
        blocks.push(
          <span key="cell" className="block">
            <span className="text-muted-foreground">Cell: </span>
            <a href={buildTelUrl(c.contactCellPhone)} className={VISITS_TABLE_LINK_CLASS}>
              {c.contactCellPhone}
            </a>
          </span>
        );
      }
      if (c.contactLandline?.trim()) {
        blocks.push(
          <span key="landline" className="block">
            <span className="text-muted-foreground">Landline: </span>
            <a href={buildTelUrl(c.contactLandline)} className={VISITS_TABLE_LINK_CLASS}>
              {c.contactLandline}
            </a>
          </span>
        );
      }
      if (c.contactEmail?.trim()) {
        blocks.push(
          <span key="email" className="block">
            <span className="text-muted-foreground">Email: </span>
            <a
              href={`mailto:${c.contactEmail}`}
              target="_blank"
              rel="noopener noreferrer"
              className={VISITS_TABLE_LINK_CLASS}
            >
              {c.contactEmail}
            </a>
          </span>
        );
      }
      const addr = formatContactAddress(c.contactAddress);
      if (addr?.trim() && addr !== '-') {
        blocks.push(
          <span key="addr" className="block">
            <span className="text-muted-foreground">Address: </span>
            <a
              href={buildMapsUrl(addr)}
              target="_blank"
              rel="noopener noreferrer"
              className={VISITS_TABLE_LINK_CLASS}
            >
              {addr}
            </a>
          </span>
        );
      }

      if (blocks.length === 0) return null;
      return <span className="whitespace-normal space-y-1 block">{blocks}</span>;
    },
  },
  {
    key: 'notes',
    label: 'Notes',
    render: (c) => c.notes || '-',
  },
  {
    key: 'quoteNumber',
    label: 'Quote Number',
    render: (c) => c.quotationNumber || '-',
  },
  {
    key: 'value',
    label: 'Value - ex-VAT',
    render: (c) =>
      c.salesValue != null
        ? `R ${Number(c.salesValue).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '-',
  },
  {
    key: 'followUp',
    label: 'Follow Up',
    render: (c) => (c.meetingLink ? (c.followUp || 'Open link') : (c.followUp || '-')),
  },
];

/** Visits tab: four charts at top (same as Live), then date range + optional user filter, search, export, and table. Admin-only; when no user is selected, the API returns all org check-ins for mapping. */
function VisitsReportTab({ isTokenReady }: { isTokenReady: boolean }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const today = new Date();
    const defaultEnd = today;
    const defaultStart = subDays(today, 30);

    const [startDate, setStartDate] = useState<Date>(defaultStart);
    const [endDate, setEndDate] = useState<Date>(defaultEnd);
    const [useAllTime, setUseAllTime] = useState(false);
    const [selectedUserUid, setSelectedUserUid] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [exportLoading, setExportLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVisit, setSelectedVisit] = useState<VisitExportItem | null>(null);
    const [visitDetailOpen, setVisitDetailOpen] = useState(false);

    const { backendUserData: profile } = useSessionSync();
    const isManager = isStaffDashboardVisible(profile?.accessLevel);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    // When no user is selected, backend returns all org check-ins (admin/manager/owner). When useAllTime, no date filter = all logs.
    const checkInsQuery = useCheckIns(
        useAllTime
            ? { ...(isManager && selectedUserUid ? { userUid: selectedUserUid } : {}) }
            : {
                  startDate: startStr,
                  endDate: endStr,
                  ...(isManager && selectedUserUid ? { userUid: selectedUserUid } : {}),
              },
        { enabled: mounted && isTokenReady }
    );

    const usersQuery = useUsers({ enabled: mounted && isTokenReady && isManager });

    const checkIns: VisitExportItem[] = checkInsQuery.data?.checkIns ?? [];
    const isLoading = checkInsQuery.isLoading;

    const uniqueRegions = useMemo(() => {
        const set = new Set<string>();
        for (const c of checkIns) {
            set.add(extractRegionFromVisit(c));
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [checkIns]);

    const filteredCheckIns = useMemo(() => {
        let list = checkIns;
        if (selectedRegion) {
            list = list.filter((c) => extractRegionFromVisit(c) === selectedRegion);
        }
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter((c) => {
            const ownerName = c.owner
                ? [c.owner.name, c.owner.surname].filter(Boolean).join(' ')
                : '';
            const searchable = [
                ownerName,
                c.owner?.email,
                c.owner?.phone,
                c.contactFullName,
                c.companyName,
                c.notes,
                c.contactCellPhone,
                c.contactLandline,
                c.contactEmail,
                c.businessType,
                c.personSeenPosition,
                c.quotationNumber,
                c.followUp,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const rowText = visitToExportRow(c).join(' ').toLowerCase();
            return searchable.includes(q) || rowText.includes(q);
        });
    }, [checkIns, searchQuery, selectedRegion]);

    const exportScopeLabel = useMemo(() => {
        if (!selectedUserUid) return 'All users';
        const users = usersQuery.data ?? [];
        const u = users.find((x) => String(x.uid) === selectedUserUid);
        if (u) {
            const name = [u.name, u.surname].filter(Boolean).join(' ').trim();
            return name || `User ${selectedUserUid}`;
        }
        const first = checkIns[0]?.owner;
        if (first) {
            const name = [first.name, (first as { surname?: string }).surname].filter(Boolean).join(' ').trim();
            return name || `User ${selectedUserUid}`;
        }
        return `User ${selectedUserUid}`;
    }, [selectedUserUid, usersQuery.data, checkIns]);

    const exportUserSlug = useMemo(() => {
        if (!selectedUserUid) return '';
        const label = exportScopeLabel.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        return label ? `-${label}` : `-${selectedUserUid}`;
    }, [selectedUserUid, exportScopeLabel]);

    const handleExport = (exportFormat: 'csv' | 'excel' | 'pdf') => {
        if (filteredCheckIns.length === 0) {
            toast.error('No visits to export');
            return;
        }
        setExportLoading(true);
        try {
            const baseName = useAllTime
                ? `visits-all-time${exportUserSlug}`
                : `visits-${startStr}-${endStr}${exportUserSlug}`;
            exportVisits(filteredCheckIns, exportFormat, baseName);
            toast.success('Export downloaded');
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Export failed';
            toast.error(msg);
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Visits charts at top – same 4 cards as Live tab, driven by selected date range */}
            <div className="shrink-0 mb-6">
                {!isLoading && (
                    <p className="text-sm text-muted-foreground mb-3">
                        {useAllTime
                            ? 'All time'
                            : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}{' '}
                        · Total visits: <strong>{checkIns.length.toLocaleString()}</strong>
                    </p>
                )}
                <VisitsChartsSection
                    checkIns={checkIns}
                    reportTotal={checkIns.length}
                    reportLoading={isLoading}
                />
            </div>

            {/* Toolbar: date range, user filter, search, export */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 min-w-[140px] bg-white border-gray-200 text-foreground justify-center gap-2"
                                >
                                    <CalendarIcon className="size-4" />
                                    {useAllTime
                                        ? 'All time'
                                        : startDate.getTime() === endDate.getTime()
                                          ? format(startDate, 'MMM d, yyyy')
                                          : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto min-w-[480px] p-0" align="start">
                                <div className="p-2 flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant={useAllTime ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setUseAllTime(true)}
                                        >
                                            All time
                                        </Button>
                                        <span className="text-xs text-muted-foreground">or pick a date range below</span>
                                    </div>
                                    <div className="flex flex-row gap-6">
                                        <div>
                                            <p className="text-sm font-medium">Start date</p>
                                            <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={(d) => {
                                                    if (d) {
                                                        setUseAllTime(false);
                                                        setStartDate(d);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">End date</p>
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={(d) => {
                                                    if (d) {
                                                        setUseAllTime(false);
                                                        setEndDate(d);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        {(() => {
                            const isDefaultRange =
                                !useAllTime && isSameDay(endDate, today) && differenceInCalendarDays(endDate, startDate) === 30;
                            return useAllTime || !isDefaultRange ? (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setUseAllTime(false);
                                        setStartDate(subDays(new Date(), 30));
                                        setEndDate(new Date());
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setUseAllTime(false);
                                            setStartDate(subDays(new Date(), 30));
                                            setEndDate(new Date());
                                        }
                                    }}
                                    className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                                    aria-label="Reset to last 30 days"
                                >
                                    <XIcon className="size-4 text-red-600" />
                                </span>
                            ) : null;
                        })()}
                    </div>
                    {isManager && (
                        <div className="flex items-center gap-0">
                            <Select
                                value={selectedUserUid || 'all'}
                                onValueChange={(v) => setSelectedUserUid(v === 'all' ? '' : v)}
                                disabled={usersQuery.isLoading}
                            >
                                <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
                                    <SelectValue placeholder={usersQuery.isLoading ? 'Loading…' : 'All users'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {!usersQuery.isLoading && (usersQuery.data ?? []).length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            No users in organisation
                                        </div>
                                    ) : (
                                        (usersQuery.data ?? []).map((u) => (
                                            <SelectItem key={u.uid} value={String(u.uid)}>
                                                {[u.name, u.surname].filter(Boolean).join(' ').trim() || `User ${u.uid}`}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {selectedUserUid ? (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUserUid('');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedUserUid('');
                                        }
                                    }}
                                    className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                                    aria-label="Clear user filter"
                                >
                                    <XIcon className="size-4 text-red-600" />
                                </span>
                            ) : null}
                        </div>
                    )}
                    <Select
                        value={selectedRegion || 'all'}
                        onValueChange={(v) => setSelectedRegion(v === 'all' ? '' : v)}
                    >
                        <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
                            <SelectValue placeholder="All regions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All regions</SelectItem>
                            {uniqueRegions.map((region) => (
                                <SelectItem key={region} value={region}>
                                    {region}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-nowrap items-center gap-2">
                    <div className="relative w-56 min-w-0 shrink sm:w-64">
                        <Input
                            placeholder="Search visits…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                'w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0 h-9',
                                searchQuery && 'pr-8'
                            )}
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600"
                                aria-label="Clear search"
                            >
                                <XIcon className="size-4 text-red-600" />
                            </button>
                        ) : null}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 bg-white border-gray-200 text-foreground gap-1.5"
                                disabled={exportLoading || isLoading || filteredCheckIns.length === 0}
                            >
                                {exportLoading ? (
                                    <Loader2Icon className="size-4 animate-spin" />
                                ) : (
                                    <DownloadIcon className="size-4" />
                                )}
                                Export
                                <ChevronDownIcon className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuLabel className="text-muted-foreground font-normal">
                                Exporting: {exportScopeLabel}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport('csv')}>
                                CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('excel')}>
                                Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2Icon className="size-8 animate-spin text-primary" />
                </div>
            ) : checkIns.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                    No visits in this date range.
                </p>
            ) : filteredCheckIns.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                    No visits match your search.
                </p>
            ) : (
                <div className="rounded border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {VISITS_DISPLAY_COLUMNS.map((col) => (
                                    <TableHead key={col.key} className="whitespace-nowrap">
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCheckIns.map((c) => (
                                <TableRow
                                    key={c.uid}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => {
                                        setSelectedVisit(c);
                                        setVisitDetailOpen(true);
                                    }}
                                >
                                    {VISITS_DISPLAY_COLUMNS.map((col) => (
                                        <TableCell
                                            key={col.key}
                                            className="text-sm whitespace-normal align-top min-w-0"
                                        >
                                            {col.render(c)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            <VisitDetailDialog
                visit={selectedVisit}
                open={visitDetailOpen}
                onOpenChange={setVisitDetailOpen}
            />
        </div>
    );
}

export function ReportsContent() {
    const { isSignedIn } = useAuth();
    const { isTokenReady } = useTokenReady();
    const { backendUserData: profile } = useSessionSync();
    const [activeTab, setActiveTab] = useState('live');
    const [singleDate, setSingleDate] = useState<Date | null>(() => new Date());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [detailUser, setDetailUser] = useState<ReportCardUser | null>(null);

    const singleDateStr = singleDate ? format(singleDate, 'yyyy-MM-dd') : null;
    const monthForSingle = singleDate ? singleDate.getMonth() + 1 : new Date().getMonth() + 1;
    const yearForSingle = singleDate ? singleDate.getFullYear() : new Date().getFullYear();

    const monthlyQuery = useMonthlyMetrics(
        { year: yearForSingle, month: monthForSingle, includeCheckIns: false },
        { enabled: isTokenReady && activeTab === 'attendance' }
    );

    const dailyQuery = useDailyOverview(
        { date: singleDateStr ?? undefined },
        { enabled: isTokenReady && !!singleDateStr && activeTab === 'attendance' }
    );

    const monthlyByUserId = useMemo(() => {
        const map = new Map<number, MonthlyMetricsUserItem>();
        const list = monthlyQuery.data?.data?.userMetrics ?? [];
        list.forEach((u) => map.set(u.userId, u));
        return map;
    }, [monthlyQuery.data]);

    const cardUsers = useMemo((): ReportCardUser[] => {
        if (!singleDateStr || !dailyQuery.data?.data) return [];
        return fromDailyOverviewMergeMonthly(
            dailyQuery.data.data.presentUsers,
            dailyQuery.data.data.absentUsers,
            monthlyByUserId
        );
    }, [singleDateStr, dailyQuery.data, monthlyByUserId]);

    const statusFilteredUsers = useMemo(() => {
        if (statusFilter === 'all') return cardUsers;
        if (statusFilter === 'present') return cardUsers.filter((u) => u.isPresent);
        if (statusFilter === 'absent') return cardUsers.filter((u) => !u.isPresent);
        if (statusFilter === 'late') return cardUsers.filter((u) => u.isPresent && (u.lateMinutes != null && u.lateMinutes > 0));
        if (statusFilter === 'early') return cardUsers.filter((u) => u.isPresent && (u.earlyMinutes != null && u.earlyMinutes > 0));
        return cardUsers;
    }, [cardUsers, statusFilter]);

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return statusFilteredUsers;
        return statusFilteredUsers.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.phone && u.phone.toLowerCase().includes(q))
        );
    }, [statusFilteredUsers, search]);

    const isStaff = isStaffDashboardVisible(profile?.accessLevel);
    const isVisitsAdmin = profile?.accessLevel?.toLowerCase() === 'admin';
    const isLoading =
        (!!singleDateStr && dailyQuery.isLoading) || monthlyQuery.isLoading;

    const attendanceChartsProps = useMemo(() => {
        const presentCount = dailyQuery.data?.data?.presentEmployees ?? 0;
        const absentCount = dailyQuery.data?.data?.absentEmployees ?? 0;
        const attendanceRate = dailyQuery.data?.data?.attendanceRate ?? 0;
        const presentUsers = dailyQuery.data?.data?.presentUsers ?? [];
        const lateCount = presentUsers.filter((u) => (u.lateMinutes ?? 0) > 0).length;
        const onTimeCount = presentUsers.length - lateCount;
        const userMetrics = monthlyQuery.data?.data?.userMetrics ?? [];
        const summary = monthlyQuery.data?.data?.summary;
        const totalHours = summary?.totalHours ?? 0;
        const totalOvertimeHours = summary?.totalOvertimeHours ?? 0;
        return {
            presentCount,
            absentCount,
            attendanceRate,
            lateCount,
            onTimeCount,
            userMetrics,
            totalHours,
            totalOvertimeHours,
        };
    }, [dailyQuery.data, monthlyQuery.data]);

    const chartsLoading = (!!singleDateStr && dailyQuery.isLoading) || monthlyQuery.isLoading;

    return (
        <div className="flex flex-col h-full min-h-0">
            <main className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
                <h1 className="text-2xl font-semibold text-foreground mb-6 shrink-0">
                    Reports
                </h1>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0 flex flex-col flex-1 min-h-0">
                    <div className="w-full min-w-0 overflow-x-auto pb-2 overscroll-x-contain shrink-0">
                        <TabsList className="bg-transparent border-0 p-0 flex flex-nowrap gap-3 w-fit">
                            <TabsTrigger
                                value="live"
                                className={REPORTS_TAB_TRIGGER_CLASS}
                            >
                                Live
                            </TabsTrigger>
                            <TabsTrigger
                                value="attendance"
                                className={REPORTS_TAB_TRIGGER_CLASS}
                            >
                                Attendance
                            </TabsTrigger>
                        {isVisitsAdmin && (
                        <TabsTrigger
                            value="visits"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Visits
                        </TabsTrigger>
                        )}
                    </TabsList>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto mt-6">
                        {!isSignedIn || !isTokenReady ? (
                            <LoadingSpinner wrapperClassName="py-12" />
                        ) : profile && !isStaff ? (
                            <p className="text-center text-muted-foreground py-12">
                                Reports are available to staff only.
                            </p>
                        ) : (
                            <>
                                {activeTab === 'live' && <LiveReportTab isTokenReady={isTokenReady} />}
                                {activeTab === 'attendance' && (
                                    <AttendanceReportTab
                                        singleDate={singleDate}
                                        setSingleDate={setSingleDate}
                                        search={search}
                                        setSearch={setSearch}
                                        statusFilter={statusFilter}
                                        setStatusFilter={setStatusFilter}
                                        filteredUsers={filteredUsers}
                                        isLoading={isLoading}
                                        onCardClick={setDetailUser}
                                        attendanceChartsProps={attendanceChartsProps}
                                        chartsLoading={chartsLoading}
                                    />
                                )}
                                {activeTab === 'visits' && isVisitsAdmin && <VisitsReportTab isTokenReady={isTokenReady} />}
                            </>
                        )}
                    </div>
                </Tabs>
            </main>

            <ReportUserDetailModal
                user={detailUser}
                endDate={singleDate ?? new Date()}
                onClose={() => setDetailUser(null)}
            />
        </div>
    );
}

interface AttendanceReportTabProps {
    singleDate: Date | null;
    setSingleDate: (d: Date | null) => void;
    search: string;
    setSearch: (s: string) => void;
    statusFilter: StatusFilter;
    setStatusFilter: (s: StatusFilter) => void;
    filteredUsers: ReportCardUser[];
    isLoading: boolean;
    onCardClick: (u: ReportCardUser) => void;
    attendanceChartsProps: Omit<AttendanceChartsSectionProps, 'chartsLoading'>;
    chartsLoading: boolean;
}

function AttendanceReportTab({
    singleDate,
    setSingleDate,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredUsers,
    isLoading,
    onCardClick,
    attendanceChartsProps,
    chartsLoading,
}: AttendanceReportTabProps) {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Charts section: same 4 cards as Live tab, driven by selected date and month */}
            <div className="shrink-0 mb-6">
                {singleDate && !chartsLoading && (
                    <p className="text-sm text-muted-foreground mb-3">
                        {format(singleDate, 'PPP')} · Attendance rate: <strong>{attendanceChartsProps.attendanceRate}%</strong>
                    </p>
                )}
                <AttendanceChartsSection
                    {...attendanceChartsProps}
                    chartsLoading={chartsLoading}
                />
            </div>

            {/* Fixed: date, filter, search, export – no scroll */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 min-w-[140px] bg-white border-gray-200 text-foreground justify-center"
                            >
                                {singleDate
                                    ? format(singleDate, 'PPP')
                                    : 'Pick date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={singleDate ?? undefined}
                                onSelect={(d) => setSingleDate(d ?? null)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Select
                        value={statusFilter}
                        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                    >
                        <SelectTrigger className="h-9 min-w-[140px] w-[140px] bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
                            <SelectValue placeholder="Status" />
                            {statusFilter !== 'all' ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setStatusFilter('all');
                                    }}
                                    className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
                                    aria-label="Clear status filter"
                                >
                                    <XIcon className="size-4 text-muted-foreground" />
                                </button>
                            ) : null}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="early">Early</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-nowrap items-center gap-2">
                    <div className="relative w-56 min-w-0 shrink sm:w-64">
                        <Input
                            placeholder="Search by name or email"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={cn(
                                'w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0 h-9',
                                search && 'pr-8'
                            )}
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground"
                                aria-label="Clear search"
                            >
                                <XIcon className="size-4" />
                            </button>
                        ) : null}
                    </div>
                    <ExportReportDropdown singleDate={singleDate} />
                </div>
            </div>

            {/* Scrollable: only the user cards list */}
            <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading ? (
                <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <ReportUserCardSkeleton key={i} />
                        ))}
                </div>
            ) : (
                <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                    {filteredUsers.map((user) => (
                        <ReportUserCard
                            key={user.userId}
                            user={user}
                            endDate={singleDate ?? new Date()}
                            onClick={() => onCardClick(user)}
                            onSettingsClick={(e) => {
                                e.stopPropagation();
                            }}
                        />
                    ))}
                </div>
            )}
            {!isLoading && filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    No users to show. Select a date and ensure you have access.
                </p>
            )}
            </div>
        </div>
    );
}

/** Skeleton that mirrors ReportUserCard layout 1:1 for loading state. */
function ReportUserCardSkeleton() {
    const isMobile = useIsMobile();
    return (
        <Card className={cn('rounded-lg border border-gray-200 bg-white', isMobile ? 'min-h-[160px]' : 'min-h-[220px]')}>
            <CardContent
                className={cn(
                    'flex flex-col flex-1 justify-between',
                    isMobile ? 'p-3 min-h-[160px]' : 'p-4 min-h-[220px]'
                )}
            >
                <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            <Skeleton className="size-10 shrink-0 rounded-full" />
                            <div className="min-w-0 flex-1 space-y-1">
                                <Skeleton className="h-4 w-24 rounded-md" />
                                <Skeleton className="h-3 w-20 rounded-md" />
                            </div>
                        </div>
                        <Skeleton className="size-8 shrink-0 rounded-md" />
                    </div>
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-full max-w-[180px] rounded-md" />
                        <Skeleton className="h-4 w-28 rounded-md" />
                    </div>
                    <div className="w-full">
                        <Skeleton className="h-3 w-16 rounded-md mb-1" />
                        <div className="w-full grid grid-cols-7 gap-0">
                            {Array.from({ length: 7 }).map((_, j) => (
                                <Skeleton
                                    key={j}
                                    className="size-2.5 rounded-full justify-self-center"
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-3 space-y-1 shrink-0">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-2 flex-1 w-full rounded-full" />
                        <Skeleton className="h-3 w-8 rounded-md" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ReportUserCard({
    user,
    endDate,
    onClick,
    onSettingsClick,
}: {
    user: ReportCardUser;
    endDate: Date;
    onClick: () => void;
    onSettingsClick: (e: React.MouseEvent) => void;
}) {
    const isMobile = useIsMobile();
    const expectedByNow = getExpectedHoursByDate(endDate);
    return (
        <Card
            className={cn(
                'cursor-pointer transition-colors hover:opacity-90 bg-white border rounded-lg',
                user.isPresent ? 'border-green-500' : 'border-red-500'
            )}
            onClick={onClick}
        >
            <CardContent
                className={cn(
                    'flex flex-col flex-1 justify-between',
                    isMobile
                        ? 'p-3 min-h-[160px] gap-2'
                        : 'p-4 min-h-[220px] gap-3'
                )}
            >
                <div className={cn('flex flex-col flex-1', isMobile ? 'gap-2' : 'gap-3')}>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            <Avatar className={cn('shrink-0', isMobile ? 'size-8' : 'size-10')}>
                                <AvatarImage src={user.photoURL ?? undefined} />
                                <AvatarFallback>
                                    {user.name
                                        .split(/\s+/)
                                        .map((s) => s[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className={cn('font-medium text-foreground truncate', isMobile && 'text-sm')}>
                                    {user.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {[user.role, user.branch].filter(Boolean).join(' · ') || '—'}
                                </p>
                            </div>
                        </div>
                        <Link
                            href={`/reports/users/${user.ref}/settings`}
                            onClick={onSettingsClick}
                            className="shrink-0 rounded-md p-1 sm:p-1.5 bg-white border border-gray-200 text-foreground hover:bg-gray-50"
                            aria-label="User settings"
                        >
                            <SettingsIcon className={isMobile ? 'size-3.5' : 'size-4'} />
                        </Link>
                    </div>
                    <div className={cn('space-y-0.5 sm:space-y-1', isMobile ? 'text-xs' : 'text-sm')}>
                        <a
                            href={`mailto:${user.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate text-primary hover:underline"
                        >
                            {user.email}
                        </a>
                        {user.phone && (
                            <a
                                href={`tel:${user.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block truncate text-primary hover:underline"
                            >
                                {user.phone}
                            </a>
                        )}
                    </div>
                    <div className="w-full">
                        <p className="text-xs text-muted-foreground mb-1">Last 7 days</p>
                        <div className="w-full">
                            <LastSevenDaysDots userRef={user.ref} endDate={endDate} />
                        </div>
                    </div>
                </div>
                <div className={cn('shrink-0', isMobile ? 'mt-2 space-y-0.5' : 'mt-3 space-y-1')}>
                    <p className={cn('text-muted-foreground flex items-center justify-between gap-2', isMobile ? 'text-xs' : 'text-sm')}>
                        <span>
                            <strong className="text-foreground">{user.hoursThisMonth}h</strong>
                            /{EXPECTED_MONTHLY_HOURS}h this month
                        </span>
                        <span className="shrink-0">~{expectedByNow}h expected</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <ReportProgressBar value={user.progressPercent} />
                        <span
                            className={cn(
                                'text-xs tabular-nums font-medium',
                                getProgressColorClasses(user.progressPercent).text
                            )}
                        >
                            {user.progressPercent}%
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ReportUserDetailModal({
    user,
    endDate,
    onClose,
}: {
    user: ReportCardUser | null;
    endDate: Date;
    onClose: () => void;
}) {
    const open = !!user;
    const expectedByNow = getExpectedHoursByDate(endDate);
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-md"
            >
                <div className="flex items-start justify-between gap-2">
                    <DialogHeader>
                        <DialogTitle>
                            {user ? user.name : 'User details'}
                        </DialogTitle>
                    </DialogHeader>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="shrink-0 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 shadow-none focus:ring-0"
                        aria-label="Close"
                    >
                        <XIcon className="size-4 text-red-600" />
                    </Button>
                </div>
                {user && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-12">
                                <AvatarImage src={user.photoURL ?? undefined} />
                                <AvatarFallback>
                                    {user.name
                                        .split(/\s+/)
                                        .map((s) => s[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="font-medium">{user.name}</p>
                                <a
                                    href={`mailto:${user.email}`}
                                    className="text-sm text-primary hover:underline block truncate"
                                >
                                    {user.email}
                                </a>
                                {user.phone && (
                                    <a
                                        href={`tel:${user.phone}`}
                                        className="text-sm text-primary hover:underline block truncate"
                                    >
                                        {user.phone}
                                    </a>
                                )}
                                {(user.role || user.branch) && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {[user.role, user.branch]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">
                                    Hours this month:
                                </span>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <span className="font-medium">
                                        {user.hoursThisMonth}h/{EXPECTED_MONTHLY_HOURS}h this month
                                    </span>
                                    <span className="text-muted-foreground shrink-0">
                                        ~{expectedByNow}h expected
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ReportProgressBar value={user.progressPercent} />
                                <span
                                    className={cn(
                                        'text-xs tabular-nums font-medium',
                                        getProgressColorClasses(user.progressPercent).text
                                    )}
                                >
                                    {user.progressPercent}%
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Status:
                                </span>{' '}
                                <span
                                    className={cn(
                                        'font-medium',
                                        user.isPresent
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                    )}
                                >
                                    {user.isPresent ? 'Present' : 'Absent'}
                                </span>
                            </div>
                        </div>
                        <Link
                            href={`/reports/users/${user.ref}/settings`}
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                            <SettingsIcon className="size-4" />
                            User settings
                        </Link>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
