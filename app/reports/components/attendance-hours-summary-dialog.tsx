'use client';

import { useMemo } from 'react';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import type { PayrollHoursAllResponse } from '@/api/endpoints/attendance';
import type { UserListItem } from '@/api/endpoints/user';
import type { AttendanceReportUserMetric } from '@/api/types';
import {
  resolveAttendanceReportBreakTakenDisplay,
  resolveAttendanceReportPeriodHoursDisplay,
} from '@/api/types';
import type { BranchListItem } from '@/api/types/branch';
import type { AttendanceRangeCheckIn } from '@/app/reports/types/attendance-range-check-in';
import { branchFlagAndLabel } from '@/app/reports/utils/branch-person-cell';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function ymFromCheckIn(iso: string): string | null {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

function buildAttendanceYmdSetsByUid(
  checkIns: AttendanceRangeCheckIn[]
): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const row of checkIns) {
    const uid = row.owner?.uid;
    if (uid == null) continue;
    const ymd = ymFromCheckIn(row.checkIn);
    if (ymd == null) continue;
    let set = map.get(uid);
    if (!set) {
      set = new Set<string>();
      map.set(uid, set);
    }
    set.add(ymd);
  }
  return map;
}

type DayStatus = 'attended' | 'missed' | 'future';

function PeriodAttendanceDots({
  intervalDaysUtc: intervalDays,
  todayYmd,
  attendedYmds,
  isSkeleton,
}: {
  intervalDaysUtc: Date[];
  todayYmd: string;
  attendedYmds: Set<string>;
  isSkeleton: boolean;
}) {
  const cellClass =
    'flex min-w-0 w-full flex-col items-center gap-0.5';

  if (isSkeleton) {
    return (
      <div className="grid grid-cols-7 gap-x-1 gap-y-2 pb-1">
        {intervalDays.map((d) => (
          <div
            key={format(d, 'yyyy-MM-dd')}
            className={cellClass}
          >
            <span className="text-[10px] text-muted-foreground opacity-40">••</span>
            <div className="size-2.5 rounded-full bg-muted animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-x-1 gap-y-2 pb-1">
      {intervalDays.map((d) => {
        const ymd = format(d, 'yyyy-MM-dd');
        let status: DayStatus = 'missed';
        if (ymd > todayYmd) status = 'future';
        else if (attendedYmds.has(ymd)) status = 'attended';

        return (
          <div
            key={ymd}
            className={cellClass}
            title={`${ymd}: ${status}`}
          >
            <span className="text-[10px] text-muted-foreground">
              {format(d, 'EEE d')}
            </span>
            <div
              className={cn(
                'size-2.5 rounded-full shrink-0',
                status === 'attended' && 'bg-green-500',
                status === 'missed' && 'bg-red-500',
                status === 'future' && 'bg-muted/50'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function SalesPersonCell({
  row,
  listUser,
  branchByUid,
}: {
  row: AttendanceReportUserMetric;
  listUser: UserListItem | undefined;
  branchByUid: Map<number, BranchListItem>;
}) {
  const displayName =
    listUser != null
      ? [listUser.name, listUser.surname].filter(Boolean).join(' ').trim() ||
        row.userInfo.name
      : row.userInfo.name;
  const email = listUser?.email ?? row.userInfo.email ?? '—';
  const imgSrc = listUser?.photoURL ?? listUser?.avatar ?? undefined;
  const initials =
    displayName.trim().length > 0
      ? displayName.trim().slice(0, 2).toUpperCase()
      : '—';

  const { flag: branchFlag, label: branchLabel } =
    listUser != null
      ? branchFlagAndLabel(listUser, branchByUid)
      : {
          flag: '',
          label: row.userInfo.branch?.trim() || '—',
        };

  return (
    <TableCell className="whitespace-normal align-middle">
      <span className="flex items-start gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={imgSrc ?? undefined} alt={displayName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="block min-w-0 space-y-0.5">
          <span className="block font-medium leading-tight">
            {displayName.trim() || `User ${row.userId}`}
          </span>
          <span className="text-muted-foreground block text-xs">{email}</span>
          <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            {listUser != null ? (
              <>
                <span aria-hidden>{branchFlag}</span>
                <span className="min-w-0 leading-tight">{branchLabel}</span>
              </>
            ) : (
              <span className="min-w-0 leading-tight">{branchLabel}</span>
            )}
          </span>
        </span>
      </span>
    </TableCell>
  );
}

export interface AttendanceHoursSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userMetrics: AttendanceReportUserMetric[];
  isLoading: boolean;
  periodLabel?: string;
  usersList: UserListItem[];
  branches: BranchListItem[];
  filteredCheckIns: AttendanceRangeCheckIn[];
  dateFrom: string;
  dateTo: string;
  isRangeLoading: boolean;
  payrollData: PayrollHoursAllResponse | null | undefined;
  payrollIsLoading: boolean;
}

export function AttendanceHoursSummaryDialog({
  open,
  onOpenChange,
  userMetrics,
  isLoading,
  periodLabel,
  usersList,
  branches,
  filteredCheckIns,
  dateFrom,
  dateTo,
  isRangeLoading,
  payrollData,
  payrollIsLoading,
}: AttendanceHoursSummaryDialogProps) {
  const payrollHoursByUserId = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of payrollData?.userMetrics ?? []) {
      map.set(m.userId, m.payrollHours);
    }
    return map;
  }, [payrollData?.userMetrics]);

  const payrollPeriodSubtitle = useMemo(() => {
    const start = payrollData?.period?.startDate;
    const end = payrollData?.period?.endDate;
    if (!start || !end) return '(current payroll period)';
    return `(${format(parseISO(start), 'd MMM')} - ${format(parseISO(end), 'd MMM')})`;
  }, [payrollData?.period?.endDate, payrollData?.period?.startDate]);

  const branchByUid = useMemo(
    () => new Map<number, BranchListItem>(branches.map((b) => [b.uid, b])),
    [branches]
  );

  const intervalDays = useMemo(() => {
    const start = parseISO(`${dateFrom}T12:00:00`);
    const end = parseISO(`${dateTo}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (start > end) return [];
    return eachDayOfInterval({ start, end });
  }, [dateFrom, dateTo]);

  const todayYmd = format(new Date(), 'yyyy-MM-dd');

  const ymdSetsByUid = useMemo(
    () => buildAttendanceYmdSetsByUid(filteredCheckIns),
    [filteredCheckIns]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-[calc(100%-2rem)] flex-col sm:max-w-[min(90vw,80rem)]">
        <DialogHeader>
          <DialogTitle>Hours summary</DialogTitle>
          <DialogDescription>
            {periodLabel
              ? `Hours, break time, and attendance in the selected period (${periodLabel}). Payroll hours use the organisation payroll window (shown under that column), not this date range.`
              : 'Hours, break time, and attendance for the selected filters and date range. Payroll hours use the organisation payroll window (shown under that column).'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingSpinner wrapperClassName="py-12" />
        ) : userMetrics.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No user metrics for this period.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto -mx-1 px-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales Person</TableHead>
                <TableHead className="tabular-nums">Emp code</TableHead>
                <TableHead className="text-right tabular-nums">Hours</TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  Break time taken
                </TableHead>
                <TableHead className="h-auto whitespace-normal py-2 align-bottom text-right">
                  <span className="block leading-tight">Payroll hours</span>
                  <span className="text-muted-foreground text-xs font-normal block leading-tight">
                    {payrollPeriodSubtitle}
                  </span>
                </TableHead>
                <TableHead className="min-w-[120px]">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userMetrics.map((row) => {
                const listUser = usersList.find((u) => u.uid === row.userId);
                const attended = ymdSetsByUid.get(row.userId) ?? new Set<string>();
                const hasInterval = intervalDays.length > 0;
                const showDotSkeleton = isRangeLoading && hasInterval;
                const payrollHours = payrollHoursByUserId.get(row.userId);

                return (
                  <TableRow key={row.userId}>
                    <SalesPersonCell
                      row={row}
                      listUser={listUser}
                      branchByUid={branchByUid}
                    />
                    <TableCell className="tabular-nums align-middle">
                      {listUser?.hrID != null ? String(listUser.hrID) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums align-middle">
                      {resolveAttendanceReportPeriodHoursDisplay(row.metrics)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums align-middle whitespace-nowrap">
                      {resolveAttendanceReportBreakTakenDisplay(row.metrics)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right align-middle tabular-nums',
                        payrollIsLoading && 'text-muted-foreground',
                        !payrollIsLoading &&
                          payrollHours == null &&
                          'text-muted-foreground'
                      )}
                    >
                      {payrollIsLoading ? (
                        <span className="inline-block h-4 w-10 animate-pulse rounded bg-muted" />
                      ) : payrollHours != null ? (
                        <span className="font-medium">{`${payrollHours}h`}</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="align-middle min-w-0 max-w-[min(22rem,92vw)]">
                      {!hasInterval ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <PeriodAttendanceDots
                          intervalDaysUtc={intervalDays}
                          todayYmd={todayYmd}
                          attendedYmds={attended}
                          isSkeleton={showDotSkeleton}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
