'use client';

import { useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import type { SyncProfile } from '@/api/types';
import type {
  SubThresholdDailyCallUserRow,
  TargetWarningsPayload,
  UserListItem,
  UserResponse,
} from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import type { VisitListItem } from '@/api/types/visits';
import {
  useBranches,
  useUsers,
  useUser,
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
import type { ReportsMode } from '@/app/reports/reports-mode';
import {
  buildReportingUserUidSet,
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';
import { branchFlagAndLabel } from '@/app/reports/utils/branch-person-cell';
import { OverviewFilterControls } from '@/app/reports/components/reports-overview-filters-bar';
import {
  countVisitsByOwnerUid,
  formatUtcYmd,
  getThresholdReferenceUtcDay,
  mapLeadsByUserFromReport,
  normalizeOwnerDisplayLabel,
  utcMonthStartThroughToday,
} from '@/app/reports/utils/overview-daily-summary';
import { TargetWarningDetailDialog } from '@/app/reports/components/target-warning-detail-dialog';
import { summarizeTargetWarnings } from '@/lib/target-warnings-summary';

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

const utcShortDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function formatAcknowledgedAt(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return utcShortDateTime.format(d);
}

/** UTC yyyy-MM-dd for issuedAt, or fallback when missing (aligns pending colour with overview day). */
function issuedUtcYmdForAck(tw: TargetWarningsPayload | null | undefined, thresholdYmd: string): string {
  const raw = tw?.issuedAt?.trim();
  if (!raw) return thresholdYmd;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return thresholdYmd;
  return formatUtcYmd(d);
}

function isTierAcknowledged(tw: TargetWarningsPayload): boolean {
  if (tw.level == null) return false;
  return tw.level <= (tw.acknowledgedLevel ?? 0);
}

function acknowledgedBadgeTone(
  tw: TargetWarningsPayload | null | undefined,
  thresholdYmd: string
):
  | { kind: 'none' }
  | { kind: 'ok'; tier: number; atLabel: string | null }
  | { kind: 'pending'; urgency: 'amber' | 'red'; issuedDay: string } {
  if (tw == null) return { kind: 'none' };
  const level = tw.level;
  if (level !== 1 && level !== 2 && level !== 3) return { kind: 'none' };

  if (isTierAcknowledged(tw)) {
    return { kind: 'ok', tier: level, atLabel: formatAcknowledgedAt(tw.acknowledgedAt) };
  }

  const issuedDay = issuedUtcYmdForAck(tw, thresholdYmd);
  return {
    kind: 'pending',
    urgency: issuedDay < thresholdYmd ? 'red' : 'amber',
    issuedDay,
  };
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

function acknowledgedPendingBadgeClass(urgency: 'amber' | 'red'): string {
  return urgency === 'red'
    ? 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200'
    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200';
}

function targetWarningsFromUserResponse(
  u: UserResponse | null | undefined
): TargetWarningsPayload | null | undefined {
  if (u?.userTarget == null || typeof u.userTarget !== 'object') return undefined;
  const pt = (
    u.userTarget as { personalTargets?: { targetWarnings?: TargetWarningsPayload | null } }
  ).personalTargets;
  return pt?.targetWarnings ?? undefined;
}

function buildSelfSubThresholdRow(
  profile: SyncProfile,
  detail: UserResponse | null | undefined
): SubThresholdDailyCallUserRow {
  const tw =
    profile.targetWarnings ?? targetWarningsFromUserResponse(detail) ?? null;
  const fullName =
    [detail?.name ?? profile.name, detail?.surname ?? profile.surname]
      .filter(Boolean)
      .join(' ')
      .trim() || 'You';
  return {
    uid: profile.uid,
    clerkUserId: profile.clerkUserId ?? null,
    fullName,
    email: detail?.email ?? profile.email ?? '',
    callCount: 0,
    leadCount: 0,
    targetWarnings: tw,
  };
}

function listUserFromProfileAndDetail(
  profile: SyncProfile,
  detail: UserResponse | null | undefined
): UserListItem {
  return {
    uid: profile.uid,
    name: detail?.name ?? profile.name ?? '',
    surname: detail?.surname ?? profile.surname ?? '',
    email: detail?.email ?? profile.email ?? '',
    photoURL: detail?.photoURL ?? profile.photoURL ?? null,
    avatar: detail?.avatar ?? profile.avatar ?? null,
    clerkUserId: profile.clerkUserId,
    branchUid: detail?.branchUid ?? profile.branchUid,
    branch:
      detail?.branch ??
      (profile.branch?.uid != null
        ? { uid: profile.branch.uid, name: profile.branch.name }
        : undefined),
  };
}

function TargetWarningsBreakdown({
  tw,
}: {
  tw: TargetWarningsPayload | null | undefined;
}) {
  const summary = summarizeTargetWarnings(tw);
  const level = summary.currentLevel;

  if (summary.totalIssued === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {level === 1 || level === 2 || level === 3 ? (
        <Badge
          variant="secondary"
          className={cn('w-fit rounded-full font-mono tabular-nums', warningLevelBadgeClass(level))}
        >
          L{level}
        </Badge>
      ) : null}
      <span className="text-muted-foreground text-xs tabular-nums">
        Issued {summary.totalIssued} · Ack {summary.totalAcknowledged}
      </span>
    </div>
  );
}

function TargetWarningStatusIndicator({
  tw,
  thresholdYmd,
}: {
  tw: TargetWarningsPayload | null | undefined;
  thresholdYmd: string;
}) {
  const tone = acknowledgedBadgeTone(tw ?? null, thresholdYmd);
  if (tone.kind === 'none') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (tone.kind === 'ok') {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'h-auto flex-col gap-0.5 rounded-full px-3 py-1.5 text-start',
          'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
        )}
      >
        <span className="font-semibold">{`Ack L${tone.tier}`}</span>
        <span className="text-muted-foreground text-xs font-normal tabular-nums">
          {tone.atLabel
            ? `Acknowledged at ${tone.atLabel}`
            : 'Acknowledged (no timestamp)'}
        </span>
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className={cn(
        'h-auto flex-col gap-0.5 rounded-full px-3 py-1.5 text-start',
        acknowledgedPendingBadgeClass(tone.urgency)
      )}
    >
      <span className="font-medium">Awaiting acknowledgement</span>
      <span className="font-mono text-xs font-normal opacity-95 tabular-nums">
        Issued {tone.issuedDay}
      </span>
    </Badge>
  );
}

export interface ReportsTargetsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsTargetsTab({ profile, reportsMode }: ReportsTargetsTabProps) {
  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  const selfUid = profile?.uid;
  const selfScoped =
    !elevated &&
    selfUid != null &&
    Number.isFinite(Number(selfUid));
  const showOverviewTable = elevated || selfScoped;

  const { data: userDetail } = useUser(
    selfScoped && selfUid != null ? String(selfUid) : null,
    { enabled: Boolean(selfScoped && selfUid != null) }
  );

  const [rangeStart, setRangeStart] = useState(() => {
    const { start } = utcMonthStartThroughToday();
    return start;
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const { end } = utcMonthStartThroughToday();
    return end;
  });
  const [rangePopoverOpen, setRangePopoverOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] = useState<string>('all');

  const { data: branches = [] } = useBranches();

  const branchByUid = useMemo(
    () => new Map<number, BranchListItem>(branches.map((b) => [b.uid, b])),
    [branches]
  );

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

  const reportingUidSet = useMemo(() => {
    if (selfScoped && selfUid != null) return new Set<number>([selfUid]);
    return buildReportingUserUidSet(reportingUsers);
  }, [selfScoped, selfUid, reportingUsers]);

  const thresholdUtcDay = useMemo(
    () => getThresholdReferenceUtcDay(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
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
      ...(selfScoped && selfUid != null ? { userUid: String(selfUid) } : {}),
      ...(elevated && resolvedOwnerUid !== 'all'
        ? { userUid: resolvedOwnerUid }
        : {}),
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
    };
  }, [
    thresholdYmd,
    elevated,
    selfScoped,
    selfUid,
    resolvedOwnerUid,
    selectedBranchId,
  ]);

  const thresholdCheckInsEnabled =
    Boolean(thresholdCheckInsParams.startDate && thresholdCheckInsParams.endDate) &&
    (elevated || selfScoped);

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
      ...(selfScoped && selfUid != null ? { ownerId: selfUid } : {}),
    }),
    [
      thresholdYmd,
      elevated,
      selfScoped,
      selfUid,
      selectedBranchId,
      resolvedOwnerUid,
    ]
  );

  const { data: thresholdLeadsData, isLoading: thresholdLeadsLoading } = useLeadsReport(
    thresholdLeadsParams,
    {
      enabled: (elevated || selfScoped) && Boolean(thresholdYmd),
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

  const tableRows = useMemo(() => {
    if (elevated) return filteredThresholdUsers;
    if (selfScoped && profile != null) {
      return [buildSelfSubThresholdRow(profile, userDetail ?? undefined)];
    }
    return [];
  }, [elevated, selfScoped, profile, userDetail, filteredThresholdUsers]);

  const isThresholdTableLoading = selfScoped
    ? thresholdCheckInsLoading || thresholdLeadsLoading
    : callsBelowLoading || thresholdCheckInsLoading || thresholdLeadsLoading;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
          <OverviewFilterControls
            layout="row"
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rangePopoverOpen={rangePopoverOpen}
            onRangePopoverOpenChange={setRangePopoverOpen}
            onRangeChange={({ start, end }) => {
              setRangeStart(start);
              setRangeEnd(end);
            }}
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

      {showOverviewTable ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription>
              {elevated ? (
                <>
                  Sales reps below {callsBelowData?.minCalls ?? 60} combined calls + leads on{' '}
                  <span className="font-mono tabular-nums">{thresholdYmd}</span> (UTC).
                  Branch filter applies.{' '}
                  <Link
                    href="/staff"
                    className="text-violet-600 underline-offset-2 hover:underline"
                  >
                    Staff list
                  </Link>{' '}
                  for warning tiers.
                </>
              ) : (
                <>
                  Your visits, leads, and performance warnings for{' '}
                  <span className="font-mono tabular-nums">{thresholdYmd}</span> (UTC), derived
                  from the selected date range.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isThresholdTableLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner className="min-h-0" wrapperClassName="py-0" />
              </div>
            ) : elevated && tableRows.length === 0 ? (
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
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10 p-2" />
                    <TableHead className="w-10 p-2" />
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-0">
                  {tableRows.map((u, index) => {
                    const listUser = elevated
                      ? usersList.find((x) => x.uid === u.uid)
                      : profile != null
                        ? listUserFromProfileAndDetail(profile, userDetail ?? undefined)
                        : undefined;
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
                    const { flag: branchFlag, label: branchLabel } = branchFlagAndLabel(
                      listUser,
                      branchByUid
                    );
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
                              <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                                <span aria-hidden>{branchFlag}</span>
                                <span className="min-w-0 leading-tight">{branchLabel}</span>
                              </span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums align-middle">{visits}</TableCell>
                        <TableCell className="tabular-nums align-middle">{leads}</TableCell>
                        <TableCell className="align-middle">
                          <TargetWarningsBreakdown tw={u.targetWarnings} />
                        </TableCell>
                        <TableCell className="align-middle">
                          <TargetWarningStatusIndicator tw={u.targetWarnings} thresholdYmd={thresholdYmd} />
                        </TableCell>
                        <TableCell className="w-10 p-2 text-right align-middle">
                          <TargetWarningDetailDialog
                            employeeName={displayName}
                            targetWarnings={u.targetWarnings}
                          />
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
          Unable to load your overview without a signed-in profile.
        </p>
      )}
    </div>
  );
}
