'use client';

import { useMemo, useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
    useSessionSync,
    useMonthlyMetrics,
    useDailyOverview,
    useMonthlyAttendance,
} from '@/api/hooks';
import type {
    DailyOverviewUser,
    MonthlyMetricsUserItem,
} from '@/api/types';
import { Loader2Icon, SettingsIcon, XIcon } from '@/lib/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
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
import { cn } from '@/lib/utils';
import { isStaffDashboardVisible } from '@/lib/access';
import Link from 'next/link';

const EXPECTED_MONTHLY_HOURS = 180;

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
                            d.status === 'missed' && 'bg-muted border border-gray-300',
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

/** Continuous progress bar: fill width = value%, min visible when value > 0. Tiered fill color. */
function ReportProgressBar({ value }: { value: number }) {
    const isEmpty = value === 0;
    const fillPercent = Math.min(100, Math.max(0, value));
    const fillWidth = isEmpty ? 0 : Math.max(fillPercent, 2);
    const colors = getProgressColorClasses(value);
    return (
        <div
            className={cn(
                'h-2 w-full rounded-full overflow-hidden',
                'bg-muted',
                isEmpty && 'border border-border/40'
            )}
        >
            <div
                className={cn(
                    'h-full rounded-full transition-all',
                    colors.bg
                )}
                style={{ width: `${fillWidth}%`, minWidth: isEmpty ? 0 : 4 }}
            />
        </div>
    );
}

export function ReportsContent() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const { backendUserData: profile } = useSessionSync();
    const [singleDate, setSingleDate] = useState<Date | null>(() => new Date());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [detailUser, setDetailUser] = useState<ReportCardUser | null>(null);

    const singleDateStr = singleDate ? format(singleDate, 'yyyy-MM-dd') : null;
    const monthForSingle = singleDate ? singleDate.getMonth() + 1 : new Date().getMonth() + 1;
    const yearForSingle = singleDate ? singleDate.getFullYear() : new Date().getFullYear();

    const monthlyQuery = useMonthlyMetrics(
        { year: yearForSingle, month: monthForSingle },
        { enabled: mounted && !!profile }
    );

    const dailyQuery = useDailyOverview(
        { date: singleDateStr ?? undefined },
        { enabled: mounted && !!singleDateStr && !!profile }
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
    const isLoading =
        (!!singleDateStr && dailyQuery.isLoading) || monthlyQuery.isLoading;

    if (!mounted) {
        return (
            <div className="min-h-screen">
                <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
                    <div className="flex justify-center py-12">
                        <Loader2Icon className="size-8 animate-spin text-primary" />
                    </div>
                </main>
            </div>
        );
    }

    if (!isStaff) {
        return (
            <div className="min-h-screen">
                <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
                    <p className="text-center text-muted-foreground">
                        Reports are available to staff only.
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <h1 className="text-2xl font-semibold text-foreground mb-6">
                    Reports
                </h1>
                <Tabs defaultValue="attendance" className="w-full">
                    <TabsList className="bg-transparent border-0 p-0 flex flex-nowrap gap-3 overflow-x-auto">
                        <TabsTrigger
                            value="attendance"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Attendance
                        </TabsTrigger>
                        <TabsTrigger
                            value="visits"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Visits
                        </TabsTrigger>
                        <TabsTrigger
                            value="quotations"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Quotations
                        </TabsTrigger>
                        <TabsTrigger
                            value="leads"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Leads
                        </TabsTrigger>
                        <TabsTrigger
                            value="claims"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Claims
                        </TabsTrigger>
                        <TabsTrigger
                            value="leave"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Leave
                        </TabsTrigger>
                        <TabsTrigger
                            value="iot"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            IOT
                        </TabsTrigger>
                        <TabsTrigger
                            value="tasks"
                            className={REPORTS_TAB_TRIGGER_CLASS}
                        >
                            Tasks
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="attendance" className="mt-6">
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
                        />
                    </TabsContent>
                    <TabsContent value="visits" className="mt-6">
                        <p className="text-center text-muted-foreground py-12">Coming soon</p>
                    </TabsContent>
                    <TabsContent value="quotations" className="mt-6">
                        <p className="text-center text-muted-foreground py-12">Coming soon</p>
                    </TabsContent>
                    <TabsContent value="leads" className="mt-6">
                        <p className="text-center text-muted-foreground py-12">Coming soon</p>
                    </TabsContent>
                    <TabsContent value="claims" className="mt-6">
                        <p className="text-center text-muted-foreground py-12">Coming soon</p>
                    </TabsContent>
                    <TabsContent value="leave" className="mt-6">
                        <p className="text-center text-muted-foreground py-12">Coming soon</p>
                    </TabsContent>
                    <TabsContent value="iot" className="mt-6">
                        <p className="text-center text-muted-foreground py-12">Coming soon</p>
                    </TabsContent>
                    <TabsContent value="tasks" className="mt-6">
                        <p className="text-center text-muted-foreground py-12">Coming soon</p>
                    </TabsContent>
                </Tabs>
            </main>

            <ReportUserDetailModal
                user={detailUser}
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
}: AttendanceReportTabProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                        <SelectTrigger
                            className="h-9 min-w-[140px] w-[140px] bg-white border-gray-200 text-foreground"
                        >
                            <SelectValue placeholder="Status" />
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
                <Input
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0"
                />
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card
                                key={i}
                                className="rounded-lg border border-gray-200 bg-white min-h-[220px]"
                            >
                                <CardContent className="p-4 flex flex-col flex-1 min-h-[220px] justify-between">
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
                        ))}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    return (
        <Card
            className={cn(
                'cursor-pointer transition-colors hover:opacity-90 bg-white border rounded-lg',
                user.isPresent ? 'border-green-500' : 'border-red-500'
            )}
            onClick={onClick}
        >
            <CardContent className="p-4 flex flex-col flex-1 min-h-[220px] justify-between">
                <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            <Avatar className="size-10 shrink-0">
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
                                <p className="font-medium text-foreground truncate">
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
                            className="shrink-0 rounded-md p-1.5 bg-white border border-gray-200 text-foreground hover:bg-gray-50"
                            aria-label="User settings"
                        >
                            <SettingsIcon className="size-4" />
                        </Link>
                    </div>
                    <div className="space-y-1 text-sm">
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
                <div className="mt-3 space-y-1 shrink-0">
                    <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{user.hoursThisMonth}h</strong>
                        {' / '}
                        {EXPECTED_MONTHLY_HOURS}h this month
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
    onClose,
}: {
    user: ReportCardUser | null;
    onClose: () => void;
}) {
    const open = !!user;
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
                                </span>{' '}
                                <span className="font-medium">
                                    {user.hoursThisMonth}h of {EXPECTED_MONTHLY_HOURS}h
                                </span>
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
