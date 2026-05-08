'use client';

import { useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import type { UserListItem } from '@/api/endpoints/user';
import type { SyncProfile } from '@/api/types';
import type { VisitListItem } from '@/api/types/visits';
import {
  useBranches,
  useUsers,
  useSubThresholdDailyCalls,
  useCheckIns,
  useLeadsReport,
} from '@/api/hooks';
import { isReportsElevatedViewer } from '@/lib/access';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReportsMode } from '@/app/reports/reports-content';
import {
  buildReportingUserUidSet,
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';
import { OverviewFilterControls } from '@/app/reports/components/reports-overview-filters-bar';
import {
  countVisitsByOwnerUid,
  formatUtcYmd,
  getOverviewSummaryUtcDay,
  mapLeadsByUserFromReport,
  normalizeOwnerDisplayLabel,
  utcToday,
  type OverviewTimeframe,
} from '@/app/reports/utils/overview-daily-summary';

function filterVisitListItemsByOwnerUids(
  checkIns: VisitListItem[],
  allowedUids: Set<number>,
  apply: boolean
): VisitListItem[] {
  if (!apply) return checkIns;
  return checkIns.filter((c) => {
    const uid = c.owner?.uid;
    if (uid == null) return false;
    return allowedUids.has(uid);
  });
}

function leadsCountForListUser(
  u: UserListItem | undefined,
  leadByDisplayName: Map<string, number>
): number {
  if (!u) return 0;
  const nameKey = normalizeOwnerDisplayLabel(u.name, u.surname);
  return (
    (nameKey ? leadByDisplayName.get(nameKey) : undefined) ??
    (u.email ? leadByDisplayName.get(u.email.trim()) ?? 0 : 0)
  );
}

function warningLevelBadgeClass(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200';
    case 2:
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200';
    case 3:
      return 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200';
  }
}

export interface ReportsTargetsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsTargetsTab({ profile, reportsMode }: ReportsTargetsTabProps) {
  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  const [timeframe, setTimeframe] = useState<OverviewTimeframe>('month');
  const [dayPopoverOpen, setDayPopoverOpen] = useState(false);
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(() => utcToday());
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => utcToday());
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] = useState<string>('all');

  const { data: branches = [] } = useBranches();
  const { data: usersList = [] } = useUsers({
    enabled: elevated,
    limit: 250,
    ...(selectedBranchId !== 'all'
      ? { branchId: Number(selectedBranchId) }
      : {}),
  });

  const reportingUsers = useMemo(
    () =>
      elevated ? usersList.filter(userListItemInLeadsVisitsReportingCohort) : usersList,
    [elevated, usersList]
  );

  const resolvedOwnerUid = useMemo(() => {
    if (!elevated || selectedOwnerUid === 'all') return selectedOwnerUid;
    return reportingUsers.some((u) => String(u.uid) === selectedOwnerUid)
      ? selectedOwnerUid
      : 'all';
  }, [elevated, selectedOwnerUid, reportingUsers]);

  const reportingUidSet = useMemo(
    () => buildReportingUserUidSet(reportingUsers),
    [reportingUsers]
  );

  const thresholdUtcDay = useMemo(
    () => getOverviewSummaryUtcDay(timeframe, selectedDay, monthAnchor),
    [timeframe, selectedDay, monthAnchor]
  );
  const thresholdYmd = formatUtcYmd(thresholdUtcDay);

  const callsBelowBranchId =
    selectedBranchId !== 'all' ? Number(selectedBranchId) : undefined;
  const { data: callsBelowData, isFetching: callsBelowLoading } = useSubThresholdDailyCalls(
    elevated ? { date: thresholdYmd, branchId: callsBelowBranchId } : null,
    { enabled: elevated && !!thresholdYmd }
  );

  const thresholdCheckInsParams = useMemo(() => {
    const startIso = `${thresholdYmd}T00:00:00.000Z`;
    const endIso = `${thresholdYmd}T23:59:59.999Z`;
    return {
      startDate: startIso,
      endDate: endIso,
      ...(elevated && resolvedOwnerUid !== 'all'
        ? { userUid: resolvedOwnerUid }
        : {}),
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
    };
  }, [thresholdYmd, elevated, resolvedOwnerUid, selectedBranchId]);

  const thresholdCheckInsEnabled =
    elevated &&
    Boolean(thresholdCheckInsParams.startDate && thresholdCheckInsParams.endDate);

  const {
    data: thresholdCheckInsData,
    isLoading: thresholdCheckInsLoading,
  } = useCheckIns(thresholdCheckInsParams, {
    enabled: thresholdCheckInsEnabled,
  });

  const thresholdLeadsParams = useMemo(
    () => ({
      from: thresholdYmd,
      to: thresholdYmd,
      dateBasis: 'activity' as const,
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
      ...(elevated && resolvedOwnerUid !== 'all'
        ? { ownerId: Number(resolvedOwnerUid) }
        : {}),
    }),
    [thresholdYmd, elevated, selectedBranchId, resolvedOwnerUid]
  );

  const { data: thresholdLeadsData, isLoading: thresholdLeadsLoading } = useLeadsReport(
    thresholdLeadsParams,
    {
      enabled: elevated && Boolean(thresholdYmd),
    }
  );

  const thresholdCheckInsForTable = useMemo(() => {
    const raw = thresholdCheckInsData?.checkIns ?? [];
    return filterVisitListItemsByOwnerUids(
      raw,
      reportingUidSet,
      elevated && resolvedOwnerUid === 'all'
    );
  }, [
    thresholdCheckInsData?.checkIns,
    reportingUidSet,
    elevated,
    resolvedOwnerUid,
  ]);

  const visitsByUid = useMemo(
    () => countVisitsByOwnerUid(thresholdCheckInsForTable),
    [thresholdCheckInsForTable]
  );

  const leadByDisplayName = useMemo(
    () => mapLeadsByUserFromReport(thresholdLeadsData?.byUser),
    [thresholdLeadsData?.byUser]
  );

  const filteredThresholdUsers = useMemo(() => {
    const raw = callsBelowData?.users ?? [];
    return raw.filter((u) => {
      if (!reportingUidSet.has(u.uid)) return false;
      if (resolvedOwnerUid !== 'all' && u.uid !== Number(resolvedOwnerUid)) return false;
      return true;
    });
  }, [callsBelowData?.users, reportingUidSet, resolvedOwnerUid]);

  const isThresholdTableLoading =
    callsBelowLoading || thresholdCheckInsLoading || thresholdLeadsLoading;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
          <OverviewFilterControls
            layout="row"
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            dayPopoverOpen={dayPopoverOpen}
            onDayPopoverOpenChange={setDayPopoverOpen}
            monthPopoverOpen={monthPopoverOpen}
            onMonthPopoverOpenChange={setMonthPopoverOpen}
            selectedDay={selectedDay}
            onSelectedDayChange={setSelectedDay}
            monthAnchor={monthAnchor}
            onMonthAnchorChange={setMonthAnchor}
            elevated={elevated}
            branches={branches}
            reportingUsers={reportingUsers}
            selectedBranchId={selectedBranchId}
            onBranchChange={(v) => {
              setSelectedBranchId(v);
              setSelectedOwnerUid('all');
            }}
            selectedOwnerUid={resolvedOwnerUid}
            onOwnerChange={setSelectedOwnerUid}
          />
        </div>
      </div>

      {elevated ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription>
              Sales reps under {callsBelowData?.minCalls ?? 60} calls on{' '}
              <span className="font-mono tabular-nums">{thresholdYmd}</span> (UTC). Branch
              filter applies.{' '}
              <Link href="/staff" className="text-violet-600 underline-offset-2 hover:underline">
                Staff list
              </Link>{' '}
              for warning tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isThresholdTableLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner className="min-h-0" wrapperClassName="py-0" />
              </div>
            ) : filteredThresholdUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">
                No sales reps below threshold for this day.
              </p>
            ) : (
              <Table>
                <TableHeader className="[&_tr]:border-0">
                  <TableRow className="border-0 hover:bg-transparent bg-muted/40">
                    <TableHead>Sales Person</TableHead>
                    <TableHead className="tabular-nums">Visits</TableHead>
                    <TableHead className="tabular-nums">Leads</TableHead>
                    <TableHead>Warnings</TableHead>
                    <TableHead className="w-10 p-2" />
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-0">
                  {filteredThresholdUsers.map((u, index) => {
                    const listUser = usersList.find((x) => x.uid === u.uid);
                    const imgSrc = listUser?.photoURL ?? listUser?.avatar ?? undefined;
                    const displayName =
                      listUser != null
                        ? [listUser.name, listUser.surname].filter(Boolean).join(' ').trim() ||
                          u.fullName
                        : u.fullName;
                    const initials =
                      displayName.length > 0
                        ? displayName.slice(0, 2).toUpperCase()
                        : '—';
                    const visits = visitsByUid.get(u.uid) ?? 0;
                    const leads = leadsCountForListUser(listUser, leadByDisplayName);
                    const level = u.targetWarnings?.level;
                    return (
                      <TableRow
                        key={u.uid}
                        className={cn(
                          'border-0',
                          index % 2 === 0 && 'bg-muted/30 hover:bg-muted/40'
                        )}
                      >
                        <TableCell className="whitespace-normal align-middle">
                          <span className="flex items-start gap-2">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={imgSrc ?? undefined} alt={displayName} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="block min-w-0 space-y-0.5">
                              <span className="block font-medium leading-tight">{displayName}</span>
                              <span className="text-muted-foreground block text-xs">{u.email}</span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums align-middle">{visits}</TableCell>
                        <TableCell className="tabular-nums align-middle">{leads}</TableCell>
                        <TableCell className="align-middle">
                          {level === 1 || level === 2 || level === 3 ? (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-full font-mono tabular-nums',
                                warningLevelBadgeClass(level)
                              )}
                            >
                              L{level}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="w-10 p-2 text-right align-middle">
                          <Link
                            href={`/reports/users/${u.uid}/settings`}
                            className="inline-flex text-violet-600 hover:text-violet-700"
                            aria-label="Target settings"
                          >
                            <Settings className="size-4 shrink-0" aria-hidden />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">
          Overview table is available for org reports viewers.
        </p>
      )}
    </div>
  );
}
