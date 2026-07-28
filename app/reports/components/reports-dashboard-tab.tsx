'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  useApiClient,
  useAttendanceReport,
  useAttMetrics,
  useAttMetricsByUser,
  useBranches,
  useCheckIns,
  useCheckInsDispatchSummary,
  useCheckInsReport,
  useEngagementRange,
  useLeadsReport,
  useMonthlyMetrics,
  usePatchUserPreferences,
  usePayrollHoursAll,
  useProductsSales,
  useRepJourney,
  useSalesTeamComposition,
  useSessionSync,
  useStoresSales,
  useTeamTargets,
  useTokenReady,
  useUser,
  useUserPreferences,
} from '@/api/hooks';
import { getStoresSales } from '@/api/endpoints/erp-stores-sales';
import { getUsers, type UserListItem } from '@/api/endpoints/user';
import { resolveAttendanceReportPeriodHours } from '@/api/types/attendance';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type { VisitListItem } from '@/api/types/visits';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getReportsDataScope } from '@/lib/access';
import { ATT_CHART_HSL } from '@/lib/chart-colors';
import {
  formatUtcYmd,
  getUtcMonthRange,
  utcDateFromYmd,
  utcRangeIsoFromUtcCalendarStoredRange,
  utcToday,
} from '@/lib/utils/overview-daily-summary';
import { normalizeCountryToken } from '@/lib/utils/country-flags';
import { userListItemInLeadsVisitsReportingCohort } from '@/lib/utils/user-has-performance-target';
import {
  REPORTS_USERS_PAGE_LIMIT,
  REPORTS_USERS_QUERY_KEY,
  resolveReportsAllowlistUids,
  userUidInAllowlist,
} from '../lib/reports-scope-allowlist';
import {
  buildOwnerBranchUidMap,
  filterUsersByBranch,
  resolveUserBranchUid,
  userIdsMatchingBranch,
} from '../lib/reports-user-branch';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsGroupedBarChart } from './reports-grouped-bar-chart';
import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';
import { cn } from '@/lib/utils';
import { ReportsAttendanceMetricsPanel } from './reports-attendance-metrics-panel';
import { ReportsHoursTargetCard } from './reports-hours-target-card';
import { ReportsNamedBarChart } from './reports-named-bar-chart';
import {
  EXPECTED_MONTHLY_HOURS,
  getExpectedMonthlyHoursWeekdaysOnly,
} from '@/app/staff/lib/staff-report-constants';
import { formatPayrollPeriodLabel } from '@/lib/payroll-period';
import { ReportsSalesTargetRadialChart } from './reports-sales-target-radial-chart';
import { ReportsConversionRateRadialChart } from './reports-conversion-rate-radial-chart';
import { ReportsSection } from './reports-section';
import { ReportsTrendLineChart } from './reports-trend-line-chart';
import { ReportsUserTargetBars } from './reports-user-target-bars';
import {
  ReportsVisitsMap,
  visitMapPointsFromCheckIns,
} from './reports-visits-map';
import { formatReportMoney } from '@/app/reports/lib/reports-chart-format';
import {
  avgVisitDurationByUser,
  branchSalesTrendFromMonthly,
  countryFlagLabel,
  engagementTotals,
  expectedHoursForUtcRange,
  hoursVsTargetDonut,
  journeyDistanceBars,
  journeyDurationBars,
  journeyPlacesBars,
  REPORTS_CHART_AMBER,
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
  reportsDateSpanToJourneyRange,
  teamMemberSalesBars,
  toDonutSlices,
  toNamedBars,
  trailingMonthRanges,
} from '../lib/reports-dashboard-chart-helpers';

const USERS_PAGE_LIMIT = REPORTS_USERS_PAGE_LIMIT;

const BRANCH_SALES_TREND_COLORS = [
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_AMBER,
  REPORTS_CHART_RED,
  ATT_CHART_HSL.c4,
] as const;

async function fetchAllOrgUsers(
  client: Parameters<typeof getUsers>[0]
): Promise<UserListItem[]> {
  const all: UserListItem[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await getUsers(client, { page, limit: USERS_PAGE_LIMIT });
    const chunk = Array.isArray(res?.data) ? res.data : [];
    all.push(...chunk);
    totalPages = Math.max(1, Number(res?.meta?.totalPages) || 1);
    if (chunk.length === 0) break;
    page += 1;
    if (page > 50) break;
  }
  return all;
}

function visitIsWorked(c: VisitListItem): boolean {
  const sales = Number(c.salesValue ?? 0);
  if (Number.isFinite(sales) && sales > 0) return true;
  if (typeof c.notes === 'string' && c.notes.trim()) return true;
  if (typeof c.resolution === 'string' && c.resolution.trim()) return true;
  if (typeof c.contactFullName === 'string' && c.contactFullName.trim()) {
    return true;
  }
  return false;
}

function visitBranchUid(
  c: VisitListItem,
  ownerBranchByUid?: Map<number, number>
): number | null {
  const fromVisit = c.branch?.uid;
  if (fromVisit != null && Number.isFinite(Number(fromVisit))) {
    const n = Number(fromVisit);
    if (n > 0) return n;
  }
  const fromOwnerNested = resolveUserBranchUid({
    branch: c.owner?.branch ?? null,
    branchUid: (c.owner as { branchUid?: unknown } | null | undefined)?.branchUid,
  });
  if (fromOwnerNested != null) return fromOwnerNested;
  const ownerUid = c.owner?.uid;
  if (ownerUid != null && ownerBranchByUid?.has(Number(ownerUid))) {
    return ownerBranchByUid.get(Number(ownerUid)) ?? null;
  }
  return null;
}

function visitCountryCanon(c: VisitListItem): string | null {
  const fullAddress = c.fullAddress as { country?: string } | undefined;
  const client = c.client as { address?: { country?: string } } | undefined;
  return (
    normalizeCountryToken(client?.address?.country) ??
    normalizeCountryToken(fullAddress?.country) ??
    null
  );
}

function visitCustomerType(c: VisitListItem): string {
  const client = c.client as { type?: string } | null | undefined;
  const type = client?.type?.trim();
  if (type) return type;
  if (typeof c.businessType === 'string' && c.businessType.trim()) {
    return c.businessType.trim();
  }
  return 'Unknown';
}

function filterCheckInsForOverview(
  checkIns: VisitListItem[] | undefined,
  opts: {
    branchId: number | null;
    userId: number | null;
    country: string | null;
    ownerBranchByUid?: Map<number, number>;
  }
): VisitListItem[] {
  let rows = checkIns ?? [];
  if (opts.userId != null) {
    rows = rows.filter((c) => Number(c.owner?.uid) === opts.userId);
  }
  if (opts.branchId != null) {
    rows = rows.filter(
      (c) => visitBranchUid(c, opts.ownerBranchByUid) === opts.branchId
    );
  }
  if (opts.country) {
    rows = rows.filter((c) => visitCountryCanon(c) === opts.country);
  }
  return rows;
}

/** Match dispatch byBranch row names against alias or legal name of selected branch. */
function dispatchBranchRowMatches(
  rowName: string,
  branch: { name?: string; alias?: string | null } | null | undefined
): boolean {
  if (!branch) return false;
  const n = rowName.trim().toLowerCase();
  if (!n) return false;
  const alias = branch.alias?.trim().toLowerCase();
  const name = branch.name?.trim().toLowerCase();
  if (alias && n === alias) return true;
  if (name && n === name) return true;
  return false;
}

function seriesFromCountMap(
  map: Map<string, number>
): Array<{ name: string; value: number }> {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function ChartCard({
  title,
  description,
  children,
  isLoading,
  isError,
  onRetry,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  contentClassName?: string;
}) {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={contentClassName ?? 'pt-0'}>
        {isLoading ? (
          <div className="flex h-[224px] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex h-[224px] flex-col items-center justify-center gap-2 text-center">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-xs text-muted-foreground">Failed to load</p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-1.5 size-3.5" />
                Retry
              </Button>
            ) : null}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsDashboardTab() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const client = useApiClient();
  const accessLevel = backendUserData?.accessLevel;
  const scope = getReportsDataScope(accessLevel);
  const isMultiUser = scope !== 'self';
  const showOrgErpCharts = scope === 'org';
  const showTeamCharts = scope === 'org' || scope === 'team';
  const selfRef =
    backendUserData?.clerkUserId?.trim() ||
    (backendUserData?.uid != null ? String(backendUserData.uid) : null);

  const defaultMonth = useMemo(() => {
    const { from, to } = getUtcMonthRange(utcToday());
    return { start: utcDateFromYmd(from), end: utcDateFromYmd(to) };
  }, []);

  const [startDate, setStartDate] = useState(defaultMonth.start);
  const [endDate, setEndDate] = useState(defaultMonth.end);
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [rememberSettings, setRememberSettings] = useState(false);
  const filtersHydratedRef = useRef(false);
  const skipNextPersistRef = useRef(false);

  const prefsQuery = useUserPreferences(selfRef, {
    enabled: isTokenReady && !!selfRef,
  });
  const { mutate: persistReportsPrefs, isPending: prefsSaving } =
    usePatchUserPreferences(selfRef);

  useEffect(() => {
    if (filtersHydratedRef.current) return;
    if (prefsQuery.isError) {
      filtersHydratedRef.current = true;
      return;
    }
    if (!prefsQuery.isSuccess) return;
    const saved = prefsQuery.data?.preferences?.reportsDashboard;
    if (!saved?.rememberSettings) {
      filtersHydratedRef.current = true;
      return;
    }
    skipNextPersistRef.current = true;
    setRememberSettings(true);
    if (
      saved.startDate &&
      saved.endDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(saved.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(saved.endDate)
    ) {
      try {
        setStartDate(utcDateFromYmd(saved.startDate));
        setEndDate(utcDateFromYmd(saved.endDate));
      } catch {
        // keep default month on bad saved dates
      }
    }
    if (saved.branchId) setBranchFilter(saved.branchId);
    if (saved.userId) setUserFilter(saved.userId);
    if (saved.country) setCountryFilter(saved.country);
    filtersHydratedRef.current = true;
  }, [prefsQuery.isSuccess, prefsQuery.isError, prefsQuery.data?.preferences?.reportsDashboard]);

  useEffect(() => {
    if (!selfRef || !filtersHydratedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    if (!rememberSettings) return;

    const handle = window.setTimeout(() => {
      persistReportsPrefs({
        reportsDashboard: {
          rememberSettings: true,
          startDate: formatUtcYmd(startDate),
          endDate: formatUtcYmd(endDate),
          branchId: branchFilter,
          userId: userFilter,
          country: countryFilter,
        },
      });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [
    selfRef,
    rememberSettings,
    startDate,
    endDate,
    branchFilter,
    userFilter,
    countryFilter,
    persistReportsPrefs,
  ]);

  const handleRememberSettingsChange = (enabled: boolean) => {
    setRememberSettings(enabled);
    if (!selfRef) return;
    skipNextPersistRef.current = true;
    if (enabled) {
      persistReportsPrefs({
        reportsDashboard: {
          rememberSettings: true,
          startDate: formatUtcYmd(startDate),
          endDate: formatUtcYmd(endDate),
          branchId: branchFilter,
          userId: userFilter,
          country: countryFilter,
        },
      });
      return;
    }
    persistReportsPrefs({
      reportsDashboard: {
        rememberSettings: false,
      },
    });
  };

  const from = formatUtcYmd(startDate);
  const to = formatUtcYmd(endDate);
  const branchIdFilter =
    isMultiUser &&
    branchFilter !== 'all' &&
    Number.isFinite(Number(branchFilter))
      ? Number(branchFilter)
      : null;
  const userIdFilter = useMemo(() => {
    if (!isMultiUser) {
      return backendUserData?.uid != null && Number.isFinite(backendUserData.uid)
        ? Number(backendUserData.uid)
        : null;
    }
    if (userFilter !== 'all' && Number.isFinite(Number(userFilter))) {
      return Number(userFilter);
    }
    return null;
  }, [isMultiUser, backendUserData?.uid, userFilter]);
  const countryCodeFilter =
    isMultiUser && countryFilter !== 'all'
      ? countryFilter.trim().toUpperCase()
      : null;
  const erpCountries = countryCodeFilter ?? 'ALL';

  const rangeParams = useMemo(
    () => ({
      from,
      to,
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
    }),
    [from, to, branchIdFilter]
  );
  const checkInsIsoRange = useMemo(
    () => utcRangeIsoFromUtcCalendarStoredRange(startDate, endDate),
    [startDate, endDate]
  );

  const monthLabel = useMemo(() => {
    const current = getUtcMonthRange(utcToday());
    return from === current.from && to === current.to
      ? 'this month'
      : 'in range';
  }, [from, to]);

  const enabled = isTokenReady;

  const selfProfileQuery = useUser(selfRef, {
    enabled: enabled && scope === 'team' && !!selfRef,
    includeAssignedClients: false,
  });

  const allowlistUids = useMemo(
    () =>
      resolveReportsAllowlistUids({
        scope,
        selfUid: backendUserData?.uid,
        managedStaff: selfProfileQuery.data?.managedStaff,
      }),
    [scope, backendUserData?.uid, selfProfileQuery.data?.managedStaff]
  );

  const branchesQuery = useBranches({
    enabled: enabled && isMultiUser,
  });
  const usersQuery = useQuery({
    queryKey: [...REPORTS_USERS_QUERY_KEY, scope] as const,
    queryFn: () => fetchAllOrgUsers(client),
    enabled: enabled && isMultiUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const scopedUsers = useMemo(
    () =>
      (usersQuery.data ?? [])
        .filter(userListItemInLeadsVisitsReportingCohort)
        .filter((u) => userUidInAllowlist(u.uid, allowlistUids)),
    [usersQuery.data, allowlistUids]
  );

  /** Users attached to the selected branch (or full scoped set when All branches). */
  const branchScopedUsers = useMemo(
    () => filterUsersByBranch(scopedUsers, branchIdFilter),
    [scopedUsers, branchIdFilter]
  );

  const branchScopedUserIds = useMemo(
    () => userIdsMatchingBranch(scopedUsers, branchIdFilter),
    [scopedUsers, branchIdFilter]
  );

  const ownerBranchByUid = useMemo(
    () => buildOwnerBranchUidMap(usersQuery.data ?? []),
    [usersQuery.data]
  );

  const selectedBranch = useMemo(
    () =>
      branchIdFilter != null
        ? (branchesQuery.data ?? []).find((b) => b.uid === branchIdFilter) ??
          null
        : null,
    [branchesQuery.data, branchIdFilter]
  );

  /** When a branch is selected but the branches/users list has not resolved yet, avoid unfiltered charts. */
  const branchFilterPending =
    branchIdFilter != null &&
    ((branchesQuery.isLoading && selectedBranch == null) ||
      (!usersQuery.isSuccess && usersQuery.data == null));

  const selectedUserClerkId = useMemo(() => {
    if (!isMultiUser) {
      return (
        backendUserData?.clerkUserId?.trim() ||
        (backendUserData?.uid != null ? String(backendUserData.uid) : undefined)
      );
    }
    if (userIdFilter == null) return undefined;
    const u = scopedUsers.find((row) => row.uid === userIdFilter);
    return u?.clerkUserId?.trim() || String(userIdFilter);
  }, [
    isMultiUser,
    backendUserData?.clerkUserId,
    backendUserData?.uid,
    userIdFilter,
    scopedUsers,
  ]);

  const hasVisitClientFilters =
    branchIdFilter != null ||
    userIdFilter != null ||
    countryCodeFilter != null;

  const engagementQuery = useEngagementRange(rangeParams, { enabled });
  const leadsQuery = useLeadsReport(
    {
      ...rangeParams,
      dateBasis: 'activity',
      ...(userIdFilter != null ? { ownerId: userIdFilter } : {}),
    },
    { enabled }
  );
  /** Skip aggregate report when UI filters require client-side re-agg from the list. */
  const visitsQuery = useCheckInsReport(
    { from, to },
    { enabled: enabled && !hasVisitClientFilters }
  );
  const visitsListQuery = useCheckIns(
    {
      ...checkInsIsoRange,
      ...(selectedUserClerkId ? { userUid: selectedUserClerkId } : {}),
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
    },
    { enabled }
  );
  const attendanceQuery = useAttendanceReport(
    {
      dateFrom: from,
      dateTo: to,
      includeUserDetails: true,
      ...(branchIdFilter != null ? { branchId: String(branchIdFilter) } : {}),
    },
    { enabled }
  );

  /** Calendar month of the selected range end — enables looking back via date filter. */
  const metricsMonth = useMemo(() => {
    const y = endDate.getUTCFullYear();
    const m = endDate.getUTCMonth() + 1;
    return { year: y, month: m };
  }, [endDate]);

  const metricsMonthIsCurrent = useMemo(() => {
    const now = utcToday();
    return (
      metricsMonth.year === now.getUTCFullYear() &&
      metricsMonth.month === now.getUTCMonth() + 1
    );
  }, [metricsMonth]);

  const payrollHoursQuery = usePayrollHoursAll(
    {
      ...(branchIdFilter != null ? { branchId: String(branchIdFilter) } : {}),
    },
    { enabled: enabled && isMultiUser }
  );

  const monthlyMetricsQuery = useMonthlyMetrics(
    {
      year: metricsMonth.year,
      month: metricsMonth.month,
      includeCheckIns: false,
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
    },
    { enabled: enabled && isMultiUser }
  );

  const selfAttMetricsQuery = useAttMetrics({
    enabled: enabled && !isMultiUser,
    scope: 'full',
  });

  const selectedUserAttMetricsQuery = useAttMetricsByUser(userIdFilter, {
    enabled: enabled && isMultiUser && userIdFilter != null,
  });

  const dispatchQuery = useCheckInsDispatchSummary({ from, to }, { enabled });
  const storesSalesQuery = useStoresSales(
    { startDate: from, endDate: to, countries: erpCountries },
    { enabled: enabled && showOrgErpCharts }
  );
  const productsSalesQuery = useProductsSales(
    { startDate: from, endDate: to, countries: erpCountries, limit: 10 },
    { enabled: enabled && showOrgErpCharts }
  );
  const teamCompositionQuery = useSalesTeamComposition({
    enabled: enabled && showTeamCharts,
    ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
  });
  const teamTargetsQuery = useTeamTargets({
    enabled: enabled && showTeamCharts,
  });

  const journeyRange = useMemo(
    () => reportsDateSpanToJourneyRange(from, to),
    [from, to]
  );
  /**
   * Journey API is per-user. When the toolbar is "All users", fall back to the
   * first branch-scoped user so Tracking still shows places + daily drive distance
   * without narrowing Productivity/Sales filters incorrectly across branches.
   */
  const journeyUserId = useMemo(() => {
    if (userIdFilter != null) return userIdFilter;
    if (!isMultiUser) {
      return backendUserData?.uid != null && Number.isFinite(backendUserData.uid)
        ? Number(backendUserData.uid)
        : null;
    }
    const firstUid = branchScopedUsers[0]?.uid;
    return firstUid != null && Number.isFinite(Number(firstUid))
      ? Number(firstUid)
      : null;
  }, [userIdFilter, isMultiUser, backendUserData?.uid, branchScopedUsers]);
  const journeyUserName = useMemo(() => {
    if (journeyUserId == null) return null;
    if (!isMultiUser) {
      const self = backendUserData;
      if (!self) return null;
      const name = [self.name, self.surname].filter(Boolean).join(' ').trim();
      return name || self.email || `User ${journeyUserId}`;
    }
    const u = branchScopedUsers.find((row) => Number(row.uid) === journeyUserId)
      ?? scopedUsers.find((row) => Number(row.uid) === journeyUserId);
    if (!u) return `User ${journeyUserId}`;
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim();
    return name || u.email || `User ${journeyUserId}`;
  }, [
    journeyUserId,
    isMultiUser,
    backendUserData,
    branchScopedUsers,
    scopedUsers,
  ]);
  const hasTrackingUser = journeyUserId != null;
  const trackingUsersLoading = isMultiUser && usersQuery.isLoading;
  const journeyQuery = useRepJourney(journeyUserId, journeyRange, {
    enabled: enabled && hasTrackingUser,
  });

  const monthWindows = useMemo(() => trailingMonthRanges(to, 6), [to]);
  const monthlySalesQueries = useQueries({
    queries: monthWindows.map((m) => ({
      queryKey: [
        'erp',
        'stores',
        'sales',
        m.startDate,
        m.endDate,
        erpCountries,
        scope,
      ] as const,
      queryFn: () =>
        getStoresSales(client, {
          startDate: m.startDate,
          endDate: m.endDate,
          countries: erpCountries,
        }),
      enabled: enabled && showOrgErpCharts,
      staleTime: 5 * 60_000,
      retry: 1,
    })),
  });

  const filteredCheckIns = useMemo(
    () => {
      const base = filterCheckInsForOverview(visitsListQuery.data?.checkIns, {
        branchId: branchIdFilter,
        userId: userIdFilter,
        country: countryCodeFilter,
        ownerBranchByUid,
      });
      if (allowlistUids == null) return base;
      return base.filter((c) =>
        userUidInAllowlist(c.owner?.uid ?? null, allowlistUids)
      );
    },
    [
      visitsListQuery.data?.checkIns,
      branchIdFilter,
      userIdFilter,
      countryCodeFilter,
      ownerBranchByUid,
      allowlistUids,
    ]
  );

  const productivityGrouped = useMemo(() => {
    let users = engagementQuery.data?.users ?? [];
    if (allowlistUids != null) {
      users = users.filter((u) => userUidInAllowlist(u.uid, allowlistUids));
    }
    // Branch scope comes from engagement-range `branchId` (rangeParams).
    if (userIdFilter != null) {
      users = users.filter((u) => u.uid === userIdFilter);
    }
    return engagementTotals(users);
  }, [engagementQuery.data?.users, userIdFilter, allowlistUids]);

  const conversionTotals = useMemo(() => {
    const row = productivityGrouped[0];
    return {
      calls: row?.calls ?? 0,
      visits: row?.visits ?? 0,
      leads: row?.leads ?? 0,
    };
  }, [productivityGrouped]);

  const salesByCountryDonut = useMemo(() => {
    const rows = storesSalesQuery.data?.salesPerStore ?? [];
    const map = new Map<string, number>();
    for (const row of rows) {
      const country = row.countryCode?.trim() || 'Unknown';
      map.set(country, (map.get(country) ?? 0) + (Number(row.totalRevenue ?? 0) || 0));
    }
    const series = [...map.entries()]
      .map(([name, value]) => ({
        name: countryFlagLabel(name),
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    return toDonutSlices(series);
  }, [storesSalesQuery.data?.salesPerStore]);

  const salesByMonth = useMemo(() => {
    return monthWindows.map((m, i) => {
      const res = monthlySalesQueries[i]?.data;
      const total = (res?.salesPerStore ?? []).reduce(
        (s, row) => s + (Number(row.totalRevenue ?? 0) || 0),
        0
      );
      return { name: m.label, value: Math.round(total) };
    });
  }, [monthWindows, monthlySalesQueries]);

  const orgSalesTrend = useMemo(
    () =>
      salesByMonth.map((row) => ({
        name: row.name,
        revenue: row.value,
      })),
    [salesByMonth]
  );

  const branchSalesTrend = useMemo(() => {
    const months = monthWindows.map((m, i) => ({
      label: m.label,
      salesPerStore: monthlySalesQueries[i]?.data?.salesPerStore ?? [],
    }));
    return branchSalesTrendFromMonthly(months, 3);
  }, [monthWindows, monthlySalesQueries]);

  const salesByProduct = useMemo(() => {
    const rows = productsSalesQuery.data?.salesPerProduct ?? [];
    return rows
      .map((row) => ({
        name: (row.description?.trim() || row.itemCode?.trim() || 'Unknown').slice(
          0,
          40
        ),
        value: Math.round(Number(row.totalRevenue ?? 0) || 0),
      }))
      .filter((r) => r.value > 0)
      .slice(0, 10);
  }, [productsSalesQuery.data?.salesPerProduct]);

  const teamGenderDonut = useMemo(
    () => toDonutSlices(teamCompositionQuery.data?.byGender),
    [teamCompositionQuery.data?.byGender]
  );

  const teamWorkforceDonut = useMemo(
    () =>
      toDonutSlices(teamCompositionQuery.data?.byWorkforce, [
        REPORTS_CHART_BLUE,
        REPORTS_CHART_AMBER,
      ]),
    [teamCompositionQuery.data?.byWorkforce]
  );

  const monthlySalesLoading = monthlySalesQueries.some((q) => q.isLoading);
  const monthlySalesError = monthlySalesQueries.some((q) => q.isError);

  const teamTargetGrouped = useMemo(() => {
    const members = teamTargetsQuery.data?.data?.teamMembers ?? [];
    let filtered = members;
    if (branchFilterPending) {
      filtered = [];
    } else if (userIdFilter != null) {
      filtered = members.filter((m) => Number(m.userId) === userIdFilter);
    } else if (branchScopedUserIds != null) {
      filtered = members.filter((m) =>
        branchScopedUserIds.has(Number(m.userId))
      );
    }
    if (filtered.length === 0 && members.length === 0) {
      const summary = teamTargetsQuery.data?.data?.summary;
      if (!summary || branchIdFilter != null || userIdFilter != null) return [];
      return [
        {
          name: 'Team',
          target: Math.round(Number(summary.totalTarget ?? 0)),
          achieved: Math.round(Number(summary.totalAchieved ?? 0)),
        },
      ];
    }
    const target = filtered.reduce(
      (s, m) => s + (Number(m.targets?.sales?.target ?? 0) || 0),
      0
    );
    const achieved = filtered.reduce(
      (s, m) =>
        s +
        (Number(m.sales?.totalRevenue ?? m.targets?.sales?.current ?? 0) || 0),
      0
    );
    return [
      {
        name: 'Team',
        target: Math.round(target),
        achieved: Math.round(achieved),
      },
    ];
  }, [
    teamTargetsQuery.data?.data?.teamMembers,
    teamTargetsQuery.data?.data?.summary,
    userIdFilter,
    branchScopedUserIds,
    branchFilterPending,
    branchIdFilter,
  ]);

  const userSalesBars = useMemo(() => {
    let members = teamTargetsQuery.data?.data?.teamMembers;
    if (branchFilterPending) {
      members = [];
    } else if (userIdFilter != null && members) {
      members = members.filter((m) => Number(m.userId) === userIdFilter);
    } else if (branchScopedUserIds != null && members) {
      members = members.filter((m) =>
        branchScopedUserIds.has(Number(m.userId))
      );
    }
    return teamMemberSalesBars(members, 8);
  }, [
    teamTargetsQuery.data?.data?.teamMembers,
    userIdFilter,
    branchScopedUserIds,
    branchFilterPending,
  ]);

  const leadsStatusDonut = useMemo(
    () => toDonutSlices(leadsQuery.data?.byStatus),
    [leadsQuery.data?.byStatus]
  );
  const leadsEngagementDonut = useMemo(
    () =>
      toDonutSlices(leadsQuery.data?.byEngagement, [
        REPORTS_CHART_GREEN,
        REPORTS_CHART_RED,
      ]),
    [leadsQuery.data?.byEngagement]
  );

  const filteredVisitSeries = useMemo(() => {
    if (!hasVisitClientFilters) return null;
    const byBranch = new Map<string, number>();
    const byCountry = new Map<string, number>();
    const byRegion = new Map<string, number>();
    const byCustomer = new Map<string, number>();
    const byCustomerType = new Map<string, number>();
    let worked = 0;
    let notWorked = 0;
    for (const c of filteredCheckIns) {
      const branchLabel =
        getBranchDisplayLabel(c.branch) ||
        getBranchDisplayLabel(c.owner?.branch) ||
        'Unassigned';
      byBranch.set(branchLabel, (byBranch.get(branchLabel) ?? 0) + 1);

      const countryRaw =
        visitCountryCanon(c) ??
        (c.fullAddress as { country?: string } | undefined)?.country?.trim();
      const country = countryRaw || 'Unknown';
      byCountry.set(country, (byCountry.get(country) ?? 0) + 1);

      const region =
        (c.fullAddress as { state?: string; province?: string } | undefined)
          ?.state?.trim() ||
        (c.fullAddress as { state?: string; province?: string } | undefined)
          ?.province?.trim() ||
        'Unknown';
      byRegion.set(region, (byRegion.get(region) ?? 0) + 1);

      const customer =
        c.client?.name?.trim() || c.companyName?.trim() || 'Unknown';
      byCustomer.set(customer, (byCustomer.get(customer) ?? 0) + 1);

      const customerType = visitCustomerType(c);
      byCustomerType.set(
        customerType,
        (byCustomerType.get(customerType) ?? 0) + 1
      );

      if (visitIsWorked(c)) worked += 1;
      else notWorked += 1;
    }
    return {
      byBranch: seriesFromCountMap(byBranch),
      byCountry: seriesFromCountMap(byCountry),
      byRegion: seriesFromCountMap(byRegion),
      byCustomer: seriesFromCountMap(byCustomer),
      byCustomerType: seriesFromCountMap(byCustomerType),
      byEngagement: [
        { name: 'Worked', value: worked },
        { name: 'Not worked', value: notWorked },
      ],
    };
  }, [hasVisitClientFilters, filteredCheckIns]);

  const visitsBranchDonut = useMemo(
    () =>
      toDonutSlices(
        filteredVisitSeries?.byBranch ?? visitsQuery.data?.byBranch
      ),
    [filteredVisitSeries?.byBranch, visitsQuery.data?.byBranch]
  );
  const visitsEngagementDonut = useMemo(
    () =>
      toDonutSlices(
        filteredVisitSeries?.byEngagement ?? visitsQuery.data?.byEngagement,
        [REPORTS_CHART_GREEN, REPORTS_CHART_AMBER]
      ),
    [filteredVisitSeries?.byEngagement, visitsQuery.data?.byEngagement]
  );

  const avgDurationByUser = useMemo(
    () => avgVisitDurationByUser(filteredCheckIns, 10),
    [filteredCheckIns]
  );

  const trackingDistanceBars = useMemo(
    () => journeyDistanceBars(journeyQuery.data?.summary),
    [journeyQuery.data?.summary]
  );
  const trackingPlacesBars = useMemo(
    () => journeyPlacesBars(journeyQuery.data?.summary?.prominentLocations, 8),
    [journeyQuery.data?.summary?.prominentLocations]
  );
  const trackingDurationBars = useMemo(
    () => journeyDurationBars(journeyQuery.data?.summary),
    [journeyQuery.data?.summary]
  );

  const visitMapPoints = useMemo(
    () => visitMapPointsFromCheckIns(filteredCheckIns),
    [filteredCheckIns]
  );

  const scopedAttendanceMetrics = useMemo(() => {
    const metrics = attendanceQuery.data?.report?.userMetrics ?? [];
    if (
      allowlistUids == null &&
      userIdFilter == null &&
      branchScopedUserIds == null
    ) {
      return metrics;
    }
    return metrics.filter((m) => {
      if (userIdFilter != null && Number(m.userId) !== userIdFilter) {
        return false;
      }
      // Only apply user-list branch UID filter once the list is ready; API also
      // receives branchId. Avoid wiping metrics while users are still loading.
      if (
        branchScopedUserIds != null &&
        usersQuery.data != null &&
        !branchScopedUserIds.has(Number(m.userId))
      ) {
        return false;
      }
      return userUidInAllowlist(m.userId, allowlistUids);
    });
  }, [
    attendanceQuery.data?.report?.userMetrics,
    allowlistUids,
    userIdFilter,
    branchScopedUserIds,
    usersQuery.data,
  ]);

  const attendanceHours = useMemo(() => {
    if (
      allowlistUids != null ||
      userIdFilter != null ||
      branchIdFilter != null
    ) {
      return scopedAttendanceMetrics.reduce(
        (s, m) => s + resolveAttendanceReportPeriodHours(m.metrics),
        0
      );
    }
    const fromOrg =
      attendanceQuery.data?.report?.organizationMetrics?.totals?.totalHours;
    if (typeof fromOrg === 'number' && Number.isFinite(fromOrg) && fromOrg > 0) {
      return fromOrg;
    }
    return scopedAttendanceMetrics.reduce(
      (s, m) => s + resolveAttendanceReportPeriodHours(m.metrics),
      0
    );
  }, [
    scopedAttendanceMetrics,
    allowlistUids,
    userIdFilter,
    branchIdFilter,
    attendanceQuery.data?.report?.organizationMetrics?.totals?.totalHours,
  ]);

  const attendanceTargetHours = useMemo(() => {
    const userCount = Math.max(
      1,
      scopedAttendanceMetrics.length ||
        (allowlistUids != null || userIdFilter != null || branchIdFilter != null
          ? 1
          : (attendanceQuery.data?.report?.organizationMetrics?.totals
              ?.totalEmployees ?? 1))
    );
    return expectedHoursForUtcRange(from, to) * userCount;
  }, [
    from,
    to,
    scopedAttendanceMetrics.length,
    allowlistUids,
    userIdFilter,
    branchIdFilter,
    attendanceQuery.data?.report?.organizationMetrics?.totals?.totalEmployees,
  ]);

  const attendanceHoursDonut = useMemo(
    () => hoursVsTargetDonut(attendanceHours, attendanceTargetHours),
    [attendanceHours, attendanceTargetHours]
  );

  const attendanceByBranchHours = useMemo(() => {
    if (
      allowlistUids != null ||
      userIdFilter != null ||
      branchIdFilter != null
    ) {
      const byBranch = new Map<string, number>();
      for (const m of scopedAttendanceMetrics) {
        const label = m.userInfo?.branch?.trim() || 'Unassigned';
        const hours = resolveAttendanceReportPeriodHours(m.metrics);
        if (hours <= 0) continue;
        byBranch.set(label, (byBranch.get(label) ?? 0) + hours);
      }
      return toNamedBars(
        [...byBranch.entries()].map(([name, value]) => ({
          name,
          value: Math.round(value),
        })),
        8
      );
    }

    const branches =
      attendanceQuery.data?.report?.organizationMetrics?.byBranch ?? [];
    const fromOrg = toNamedBars(
      branches
        .map((b) => ({
          name: b.branchName ?? 'Unknown',
          value: Math.round(Number(b.totalHours ?? 0)),
        }))
        .filter((b) => b.value > 0),
      8
    );
    if (fromOrg.length > 0) return fromOrg;

    // Fallback: roll up userMetrics hours by branch label (alias from server)
    const byBranch = new Map<string, number>();
    for (const m of scopedAttendanceMetrics) {
      const label = m.userInfo?.branch?.trim() || 'Unassigned';
      const hours = resolveAttendanceReportPeriodHours(m.metrics);
      if (hours <= 0) continue;
      byBranch.set(label, (byBranch.get(label) ?? 0) + hours);
    }
    return toNamedBars(
      [...byBranch.entries()].map(([name, value]) => ({
        name,
        value: Math.round(value),
      })),
      8
    );
  }, [
    attendanceQuery.data?.report?.organizationMetrics?.byBranch,
    scopedAttendanceMetrics,
    allowlistUids,
    userIdFilter,
    branchIdFilter,
  ]);

  const singleUserAttMetrics = isMultiUser
    ? selectedUserAttMetricsQuery.data
    : selfAttMetricsQuery.data;

  const showLiveHourBuckets =
    !isMultiUser || userIdFilter != null;

  const attendancePayrollHours = useMemo(() => {
    if (singleUserAttMetrics?.totalHours?.payrollHours != null) {
      return Number(singleUserAttMetrics.totalHours.payrollHours) || 0;
    }
    const rows = payrollHoursQuery.data?.userMetrics ?? [];
    return rows.reduce((sum, m) => {
      if (userIdFilter != null && Number(m.userId) !== userIdFilter) {
        return sum;
      }
      if (
        branchScopedUserIds != null &&
        usersQuery.data != null &&
        !branchScopedUserIds.has(Number(m.userId))
      ) {
        return sum;
      }
      if (!userUidInAllowlist(m.userId, allowlistUids)) return sum;
      return sum + (Number(m.payrollHours) || 0);
    }, 0);
  }, [
    singleUserAttMetrics?.totalHours?.payrollHours,
    payrollHoursQuery.data?.userMetrics,
    userIdFilter,
    branchScopedUserIds,
    usersQuery.data,
    allowlistUids,
  ]);

  const attendanceMonthHours = useMemo(() => {
    if (
      metricsMonthIsCurrent &&
      singleUserAttMetrics?.totalHours?.thisMonth != null
    ) {
      return Number(singleUserAttMetrics.totalHours.thisMonth) || 0;
    }
    const rows = monthlyMetricsQuery.data?.data?.userMetrics ?? [];
    if (rows.length > 0) {
      return rows.reduce((sum, m) => {
        if (userIdFilter != null && Number(m.userId) !== userIdFilter) {
          return sum;
        }
        if (
          branchScopedUserIds != null &&
          usersQuery.data != null &&
          !branchScopedUserIds.has(Number(m.userId))
        ) {
          return sum;
        }
        if (!userUidInAllowlist(m.userId, allowlistUids)) return sum;
        return sum + (Number(m.totalHours) || 0);
      }, 0);
    }
    if (singleUserAttMetrics?.totalHours?.thisMonth != null) {
      return Number(singleUserAttMetrics.totalHours.thisMonth) || 0;
    }
    // Fallback: sum thisMonth buckets from the range report when available
    return scopedAttendanceMetrics.reduce((sum, m) => {
      const th = m.metrics?.totalHours;
      if (th != null && typeof th === 'object') {
        const month = (th as { thisMonth?: number }).thisMonth;
        if (typeof month === 'number' && Number.isFinite(month)) {
          return sum + month;
        }
      }
      return sum + resolveAttendanceReportPeriodHours(m.metrics);
    }, 0);
  }, [
    metricsMonthIsCurrent,
    singleUserAttMetrics?.totalHours?.thisMonth,
    monthlyMetricsQuery.data?.data?.userMetrics,
    userIdFilter,
    branchScopedUserIds,
    usersQuery.data,
    allowlistUids,
    scopedAttendanceMetrics,
  ]);

  const attendanceUserCountForTargets = useMemo(() => {
    if (userIdFilter != null || !isMultiUser) return 1;
    if (branchIdFilter != null) {
      return Math.max(
        1,
        branchScopedUsers.length || scopedAttendanceMetrics.length || 1
      );
    }
    if (allowlistUids != null) return Math.max(1, allowlistUids.length);
    const fromMonthly =
      monthlyMetricsQuery.data?.data?.userMetrics?.length ?? 0;
    if (fromMonthly > 0) return fromMonthly;
    return Math.max(
      1,
      scopedAttendanceMetrics.length ||
        (attendanceQuery.data?.report?.organizationMetrics?.totals
          ?.totalEmployees ?? 1)
    );
  }, [
    userIdFilter,
    isMultiUser,
    branchIdFilter,
    branchScopedUsers.length,
    allowlistUids,
    monthlyMetricsQuery.data?.data?.userMetrics?.length,
    scopedAttendanceMetrics.length,
    attendanceQuery.data?.report?.organizationMetrics?.totals?.totalEmployees,
  ]);

  const payrollTargetHours =
    EXPECTED_MONTHLY_HOURS * attendanceUserCountForTargets;
  const monthTargetHours =
    getExpectedMonthlyHoursWeekdaysOnly(
      metricsMonth.year,
      metricsMonth.month
    ) * attendanceUserCountForTargets;

  const payrollPeriodLabel = useMemo(() => {
    const period = payrollHoursQuery.data?.period;
    if (period?.startDate && period?.endDate) {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const fmt = (d: Date) =>
        `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
      return `${fmt(start)} to ${fmt(end)}`;
    }
    return formatPayrollPeriodLabel();
  }, [payrollHoursQuery.data?.period]);

  const monthMetricsLabel = useMemo(() => {
    const name = new Date(
      Date.UTC(metricsMonth.year, metricsMonth.month - 1, 1)
    ).toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return metricsMonthIsCurrent ? `${name} (MTD)` : name;
  }, [metricsMonth, metricsMonthIsCurrent]);

  const orgInsights =
    attendanceQuery.data?.report?.organizationMetrics?.insights;
  const orgAverageTimes =
    attendanceQuery.data?.report?.organizationMetrics?.averageTimes;

  const attendanceRate =
    typeof orgInsights?.attendanceRate === 'number' &&
    Number.isFinite(orgInsights.attendanceRate)
      ? orgInsights.attendanceRate
      : null;

  const punctualityScore = useMemo(() => {
    if (
      typeof orgInsights?.punctualityRate === 'number' &&
      Number.isFinite(orgInsights.punctualityRate)
    ) {
      return orgInsights.punctualityRate;
    }
    const fromSelf = singleUserAttMetrics?.timingPatterns?.punctualityScore;
    if (typeof fromSelf === 'number' && Number.isFinite(fromSelf)) {
      return fromSelf;
    }
    return null;
  }, [orgInsights?.punctualityRate, singleUserAttMetrics?.timingPatterns?.punctualityScore]);

  const averageCheckIn =
    orgAverageTimes?.startTime?.trim() ||
    singleUserAttMetrics?.timingPatterns?.averageCheckInTime?.trim() ||
    orgInsights?.peakCheckInTime?.trim() ||
    null;

  const averageCheckOut =
    orgAverageTimes?.endTime?.trim() ||
    singleUserAttMetrics?.timingPatterns?.averageCheckOutTime?.trim() ||
    orgInsights?.peakCheckOutTime?.trim() ||
    null;

  const attendanceMetricsLoading =
    attendanceQuery.isLoading ||
    (isMultiUser &&
      (payrollHoursQuery.isLoading || monthlyMetricsQuery.isLoading)) ||
    (!isMultiUser && selfAttMetricsQuery.isLoading) ||
    (isMultiUser &&
      userIdFilter != null &&
      selectedUserAttMetricsQuery.isLoading);

  const attendanceMetricsError =
    attendanceQuery.isError ||
    (isMultiUser &&
      (payrollHoursQuery.isError || monthlyMetricsQuery.isError)) ||
    (!isMultiUser && selfAttMetricsQuery.isError) ||
    (isMultiUser &&
      userIdFilter != null &&
      selectedUserAttMetricsQuery.isError);

  const refetchAttendanceMetrics = () => {
    void attendanceQuery.refetch();
    if (isMultiUser) {
      void payrollHoursQuery.refetch();
      void monthlyMetricsQuery.refetch();
      if (userIdFilter != null) void selectedUserAttMetricsQuery.refetch();
    } else {
      void selfAttMetricsQuery.refetch();
    }
  };

  const dispatchPlanned = useMemo(() => {
    if (branchFilterPending) return 0;
    if (branchIdFilter == null || !selectedBranch) {
      return dispatchQuery.data?.planned ?? 0;
    }
    const rows = (dispatchQuery.data?.byBranch ?? []).filter((r) =>
      dispatchBranchRowMatches(r.name, selectedBranch)
    );
    return rows.reduce((s, r) => s + (Number(r.planned) || 0), 0);
  }, [
    dispatchQuery.data?.planned,
    dispatchQuery.data?.byBranch,
    branchIdFilter,
    selectedBranch,
    branchFilterPending,
  ]);
  const dispatchCompleted = useMemo(() => {
    if (branchFilterPending) return 0;
    if (branchIdFilter == null || !selectedBranch) {
      return dispatchQuery.data?.completed ?? 0;
    }
    const rows = (dispatchQuery.data?.byBranch ?? []).filter((r) =>
      dispatchBranchRowMatches(r.name, selectedBranch)
    );
    return rows.reduce((s, r) => s + (Number(r.completed) || 0), 0);
  }, [
    dispatchQuery.data?.completed,
    dispatchQuery.data?.byBranch,
    branchIdFilter,
    selectedBranch,
    branchFilterPending,
  ]);
  const dispatchInProgress = useMemo(() => {
    if (branchFilterPending) return 0;
    if (branchIdFilter == null) {
      return dispatchQuery.data?.inProgress ?? 0;
    }
    // byBranch rows do not expose in-progress; keep 0 when branch-scoped
    return 0;
  }, [
    dispatchQuery.data?.inProgress,
    branchIdFilter,
    branchFilterPending,
  ]);
  const dispatchRemaining = Math.max(
    0,
    dispatchPlanned - dispatchCompleted - dispatchInProgress
  );
  const dispatchCompletionPct =
    dispatchPlanned > 0
      ? Math.round((dispatchCompleted / dispatchPlanned) * 100)
      : 0;

  const dispatchDonut = useMemo(
    () =>
      toDonutSlices(
        [
          { name: 'Completed', value: dispatchCompleted },
          { name: 'In progress', value: dispatchInProgress },
          { name: 'Remaining', value: dispatchRemaining },
        ],
        [REPORTS_CHART_GREEN, REPORTS_CHART_BLUE, REPORTS_CHART_AMBER]
      ),
    [dispatchCompleted, dispatchInProgress, dispatchRemaining]
  );

  const dispatchByBranch = useMemo(() => {
    const rows = dispatchQuery.data?.byBranch ?? [];
    if (branchFilterPending) return [];
    if (branchIdFilter == null || !selectedBranch) {
      return rows.map((r) => ({
        branch: r.name,
        planned: r.planned,
        completed: r.completed,
      }));
    }
    return rows
      .filter((r) => dispatchBranchRowMatches(r.name, selectedBranch))
      .map((r) => ({
        branch: r.name,
        planned: r.planned,
        completed: r.completed,
      }));
  }, [
    dispatchQuery.data?.byBranch,
    branchIdFilter,
    selectedBranch,
    branchFilterPending,
  ]);

  if (!isTokenReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-8"
      data-tour="reports-dashboard-tab"
    >
      <ReportsDashboardToolbar
        startDate={startDate}
        endDate={endDate}
        onRangeChange={({ start, end }) => {
          setStartDate(start);
          setEndDate(end);
        }}
        showDimensionFilters={isMultiUser}
        branches={branchesQuery.data ?? []}
        users={scopedUsers}
        selectedBranchId={branchFilter}
        onBranchChange={(id) => {
          setBranchFilter(id);
          setUserFilter('all');
        }}
        selectedUserId={userFilter}
        onUserChange={setUserFilter}
        selectedCountry={countryFilter}
        onCountryChange={setCountryFilter}
        rememberSettings={rememberSettings}
        onRememberSettingsChange={handleRememberSettingsChange}
        rememberSettingsDisabled={!selfRef || prefsSaving}
      />

      <ReportsSection
        title="Productivity"
        description="Calls, visits, leads, and sales target progress across the selected period."
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <ChartCard
            title="Engagement totals"
            description="Combined calls, visits, and leads"
            isLoading={engagementQuery.isLoading}
            isError={engagementQuery.isError}
            onRetry={() => void engagementQuery.refetch()}
          >
            <ReportsGroupedBarChart
              data={productivityGrouped}
              categoryKey="name"
              yAxisLabel="Activity"
              series={[
                {
                  key: 'calls',
                  label: 'Calls',
                  color: REPORTS_CHART_BLUE,
                },
                {
                  key: 'visits',
                  label: 'Visits',
                  color: REPORTS_CHART_GREEN,
                },
                {
                  key: 'leads',
                  label: 'Leads',
                  color: REPORTS_CHART_AMBER,
                },
              ]}
            />
          </ChartCard>
          <ChartCard
            title="Conversion rate"
            description="Leads as a share of visits + calls"
            isLoading={engagementQuery.isLoading}
            isError={engagementQuery.isError}
            onRetry={() => void engagementQuery.refetch()}
          >
            <ReportsConversionRateRadialChart
              leads={conversionTotals.leads}
              visits={conversionTotals.visits}
              calls={conversionTotals.calls}
            />
          </ChartCard>
          {showTeamCharts ? (
            <ChartCard
              title="Sales target vs achieved"
              description="Team sales targets rollup"
              isLoading={
                teamTargetsQuery.isLoading ||
                branchFilterPending ||
                (branchIdFilter != null && usersQuery.isLoading)
              }
              isError={teamTargetsQuery.isError}
              onRetry={() => void teamTargetsQuery.refetch()}
            >
              <ReportsSalesTargetRadialChart
                target={teamTargetGrouped[0]?.target ?? 0}
                achieved={teamTargetGrouped[0]?.achieved ?? 0}
              />
            </ChartCard>
          ) : (
            <ChartCard title="Period" description="Selected report window">
              <div className="flex h-[224px] flex-col items-center justify-center gap-1 text-center">
                <p className="text-2xl font-semibold tabular-nums">{from}</p>
                <p className="text-sm text-muted-foreground">to</p>
                <p className="text-2xl font-semibold tabular-nums">{to}</p>
              </div>
            </ChartCard>
          )}
          {showTeamCharts ? (
            <ChartCard
              title="Revenue vs target by user"
              description="Sales achievement against personal targets"
              isLoading={
                teamTargetsQuery.isLoading ||
                branchFilterPending ||
                (branchIdFilter != null && usersQuery.isLoading)
              }
              isError={teamTargetsQuery.isError}
              onRetry={() => void teamTargetsQuery.refetch()}
              contentClassName="pt-0 max-h-[280px] overflow-y-auto"
            >
              <ReportsUserTargetBars rows={userSalesBars} />
            </ChartCard>
          ) : null}
        </div>
      </ReportsSection>

      <ReportsSection
        title="Tracking"
        description={
          journeyUserName
            ? `Common visited places and avg drive distance per day for ${journeyUserName}${
                isMultiUser && userIdFilter == null
                  ? ' (pick a user above to switch)'
                  : ''
              }.`
            : 'Common visited places and avg drive distance per day.'
        }
      >
        {trackingUsersLoading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !hasTrackingUser ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No users available for tracking metrics
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Avg drive distance per day"
              description={`Daily average with week/month context (${journeyRange})`}
              isLoading={journeyQuery.isLoading}
              isError={journeyQuery.isError}
              onRetry={() => void journeyQuery.refetch()}
            >
              <ReportsNamedBarChart
                data={trackingDistanceBars}
                fill={REPORTS_CHART_BLUE}
                yAxisLabel="Distance (km)"
                seriesLabel="Distance (km)"
              />
            </ChartCard>
            <ChartCard
              title="Common visited places"
              description="Stops ranked by time spent"
              isLoading={journeyQuery.isLoading}
              isError={journeyQuery.isError}
              onRetry={() => void journeyQuery.refetch()}
            >
              <ReportsNamedBarChart
                data={trackingPlacesBars}
                fill={REPORTS_CHART_GREEN}
                valueKind="duration"
                yAxisLabel="Time spent"
              />
            </ChartCard>
            <ChartCard
              title="Travel duration"
              description="Moving travel vs stop dwell"
              isLoading={journeyQuery.isLoading}
              isError={journeyQuery.isError}
              onRetry={() => void journeyQuery.refetch()}
            >
              <ReportsNamedBarChart
                data={trackingDurationBars}
                fill={REPORTS_CHART_AMBER}
                valueKind="duration"
              />
            </ChartCard>
          </div>
        )}
      </ReportsSection>

      {showOrgErpCharts ? (
      <ReportsSection
        title="Sales"
        description="ERP store revenue, product leaders, trendlines, and sales team composition."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Revenue by country"
            description="Pastel store sales rollup"
            isLoading={storesSalesQuery.isLoading}
            isError={storesSalesQuery.isError}
            onRetry={() => void storesSalesQuery.refetch()}
          >
            <ReportDonutChart
              config={salesByCountryDonut.config}
              data={salesByCountryDonut.slices}
              centerPrimary={formatReportMoney(salesByCountryDonut.total) || 'R0'}
              centerSecondary="Revenue"
              formatValue={(v) => formatReportMoney(v) || 'R0'}
            />
          </ChartCard>
          <ChartCard
            title="Revenue by month"
            description="Org rollup — last 6 months ending in range"
            isLoading={monthlySalesLoading}
            isError={monthlySalesError}
            onRetry={() => {
              for (const q of monthlySalesQueries) void q.refetch();
            }}
          >
            <ReportsNamedBarChart
              data={salesByMonth}
              fill={REPORTS_CHART_BLUE}
              valueKind="money"
            />
          </ChartCard>
          <div className="lg:col-span-2">
            <ChartCard
              title="Sales by product"
              description="Top 10 products by revenue — whole group"
              isLoading={productsSalesQuery.isLoading}
              isError={productsSalesQuery.isError}
              onRetry={() => void productsSalesQuery.refetch()}
              contentClassName="pt-0"
            >
              <ReportsNamedBarChart
                data={salesByProduct}
                fill={REPORTS_CHART_GREEN}
                valueKind="money"
                heightClassName="h-[320px]"
              />
            </ChartCard>
          </div>
          {showTeamCharts ? (
            <>
              <ChartCard
                title="Team composition — gender"
                description="Male vs female (internal + external sales)"
                isLoading={teamCompositionQuery.isLoading}
                isError={teamCompositionQuery.isError}
                onRetry={() => void teamCompositionQuery.refetch()}
              >
                <ReportDonutChart
                  config={teamGenderDonut.config}
                  data={teamGenderDonut.slices}
                  centerPrimary={String(teamGenderDonut.total)}
                  centerSecondary="Reps"
                />
              </ChartCard>
              <ChartCard
                title="Team composition — workforce"
                description="Internal vs external sales"
                isLoading={teamCompositionQuery.isLoading}
                isError={teamCompositionQuery.isError}
                onRetry={() => void teamCompositionQuery.refetch()}
              >
                <ReportDonutChart
                  config={teamWorkforceDonut.config}
                  data={teamWorkforceDonut.slices}
                  centerPrimary={String(teamWorkforceDonut.total)}
                  centerSecondary="Reps"
                />
              </ChartCard>
            </>
          ) : null}
          <ChartCard
            title="Org sales trend"
            description="Org-wide revenue over the last 6 months"
            isLoading={monthlySalesLoading}
            isError={monthlySalesError}
            onRetry={() => {
              for (const q of monthlySalesQueries) void q.refetch();
            }}
          >
            <ReportsTrendLineChart
              data={orgSalesTrend}
              series={[
                {
                  key: 'revenue',
                  label: 'Revenue',
                  color: REPORTS_CHART_BLUE,
                },
              ]}
              valueKind="money"
            />
          </ChartCard>
          <ChartCard
            title="Branch sales trend"
            description="Top 3 branches by revenue — last 6 months"
            isLoading={monthlySalesLoading}
            isError={monthlySalesError}
            onRetry={() => {
              for (const q of monthlySalesQueries) void q.refetch();
            }}
          >
            <ReportsGroupedBarChart
              data={branchSalesTrend.data}
              categoryKey="name"
              valueKind="money"
              yAxisLabel="Revenue"
              series={branchSalesTrend.series.map((s, i) => ({
                key: s.key,
                label: s.label,
                color: BRANCH_SALES_TREND_COLORS[i % BRANCH_SALES_TREND_COLORS.length],
              }))}
            />
          </ChartCard>
        </div>
      </ReportsSection>
      ) : showTeamCharts ? (
      <ReportsSection
        title="Sales"
        description="Team composition for your managed sales cohort."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Team composition — gender"
            description="Male vs female (internal + external sales)"
            isLoading={teamCompositionQuery.isLoading}
            isError={teamCompositionQuery.isError}
            onRetry={() => void teamCompositionQuery.refetch()}
          >
            <ReportDonutChart
              config={teamGenderDonut.config}
              data={teamGenderDonut.slices}
              centerPrimary={String(teamGenderDonut.total)}
              centerSecondary="Reps"
            />
          </ChartCard>
          <ChartCard
            title="Team composition — workforce"
            description="Internal vs external sales"
            isLoading={teamCompositionQuery.isLoading}
            isError={teamCompositionQuery.isError}
            onRetry={() => void teamCompositionQuery.refetch()}
          >
            <ReportDonutChart
              config={teamWorkforceDonut.config}
              data={teamWorkforceDonut.slices}
              centerPrimary={String(teamWorkforceDonut.total)}
              centerSecondary="Reps"
            />
          </ChartCard>
        </div>
      </ReportsSection>
      ) : null}

      <ReportsSection
        title="Leads"
        description="Pipeline mix, engagement, and geographic distribution (activity in range)."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ChartCard
            title="Status mix"
            isLoading={leadsQuery.isLoading}
            isError={leadsQuery.isError}
            onRetry={() => void leadsQuery.refetch()}
          >
            <ReportDonutChart
              config={leadsStatusDonut.config}
              data={leadsStatusDonut.slices}
              centerPrimary={String(leadsStatusDonut.total)}
              centerSecondary="Leads"
            />
          </ChartCard>
          <ChartCard
            title="Worked vs not worked"
            description="Leads with activity vs none"
            isLoading={leadsQuery.isLoading}
            isError={leadsQuery.isError}
            onRetry={() => void leadsQuery.refetch()}
          >
            <ReportDonutChart
              config={leadsEngagementDonut.config}
              data={leadsEngagementDonut.slices}
              centerPrimary={String(leadsEngagementDonut.total)}
              centerSecondary="Leads"
            />
          </ChartCard>
          <ChartCard
            title="By branch"
            isLoading={leadsQuery.isLoading}
            isError={leadsQuery.isError}
            onRetry={() => void leadsQuery.refetch()}
          >
            <ReportsNamedBarChart
              data={toNamedBars(leadsQuery.data?.byBranch)}
              fill={REPORTS_CHART_BLUE}
              yAxisLabel="Leads"
              seriesLabel="Leads"
            />
          </ChartCard>
          <ChartCard
            title="By region"
            isLoading={leadsQuery.isLoading}
            isError={leadsQuery.isError}
            onRetry={() => void leadsQuery.refetch()}
          >
            <ReportsNamedBarChart
              data={toNamedBars(leadsQuery.data?.byRegion)}
              fill={REPORTS_CHART_AMBER}
              yAxisLabel="Leads"
              seriesLabel="Leads"
            />
          </ChartCard>
          <ChartCard
            title="By source"
            isLoading={leadsQuery.isLoading}
            isError={leadsQuery.isError}
            onRetry={() => void leadsQuery.refetch()}
          >
            <ReportsNamedBarChart
              data={toNamedBars(leadsQuery.data?.bySource)}
              fill={REPORTS_CHART_RED}
              yAxisLabel="Leads"
              seriesLabel="Leads"
            />
          </ChartCard>
        </div>
      </ReportsSection>

      <ReportsSection
        title="Visits"
        description="Visit allocation, map, engagement, and breakdowns by geography and customer."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ChartCard
            title="Visits map"
            description="All check-in locations in the selected range"
            isLoading={visitsListQuery.isLoading}
            isError={visitsListQuery.isError}
            onRetry={() => void visitsListQuery.refetch()}
            contentClassName="pt-0"
          >
            <ReportsVisitsMap
              points={visitMapPoints}
              totalVisits={filteredCheckIns.length}
            />
          </ChartCard>
          <ChartCard
            title="Allocation by branch"
            isLoading={visitsQuery.isLoading}
            isError={visitsQuery.isError}
            onRetry={() => void visitsQuery.refetch()}
          >
            <ReportDonutChart
              config={visitsBranchDonut.config}
              data={visitsBranchDonut.slices}
              centerPrimary={String(visitsBranchDonut.total)}
              centerSecondary="Visits"
            />
          </ChartCard>
          <ChartCard
            title="Duration per visit by user"
            description="Average visit length (checked-out visits with duration)"
            isLoading={visitsListQuery.isLoading}
            isError={visitsListQuery.isError}
            onRetry={() => void visitsListQuery.refetch()}
          >
            <ReportsNamedBarChart
              data={avgDurationByUser}
              fill={REPORTS_CHART_BLUE}
              valueKind="duration"
              yAxisLabel="Avg duration"
            />
          </ChartCard>
          <ChartCard
            title="Worked vs not worked"
            isLoading={visitsQuery.isLoading}
            isError={visitsQuery.isError}
            onRetry={() => void visitsQuery.refetch()}
          >
            <ReportDonutChart
              config={visitsEngagementDonut.config}
              data={visitsEngagementDonut.slices}
              centerPrimary={String(visitsEngagementDonut.total)}
              centerSecondary="Visits"
            />
          </ChartCard>
          <ChartCard
            title="By country"
            isLoading={
              hasVisitClientFilters
                ? visitsListQuery.isLoading
                : visitsQuery.isLoading
            }
            isError={
              hasVisitClientFilters
                ? visitsListQuery.isError
                : visitsQuery.isError
            }
            onRetry={() => {
              if (hasVisitClientFilters) void visitsListQuery.refetch();
              else void visitsQuery.refetch();
            }}
          >
            <ReportsNamedBarChart
              data={toNamedBars(
                filteredVisitSeries?.byCountry ?? visitsQuery.data?.byCountry
              ).map((r) => ({
                ...r,
                name: countryFlagLabel(r.name),
              }))}
              fill={REPORTS_CHART_GREEN}
              yAxisLabel="Visits"
              seriesLabel="Visits"
            />
          </ChartCard>
          <ChartCard
            title="By region"
            isLoading={
              hasVisitClientFilters
                ? visitsListQuery.isLoading
                : visitsQuery.isLoading
            }
            isError={
              hasVisitClientFilters
                ? visitsListQuery.isError
                : visitsQuery.isError
            }
            onRetry={() => {
              if (hasVisitClientFilters) void visitsListQuery.refetch();
              else void visitsQuery.refetch();
            }}
          >
            <ReportsNamedBarChart
              data={toNamedBars(
                filteredVisitSeries?.byRegion ?? visitsQuery.data?.byRegion
              )}
              fill={REPORTS_CHART_BLUE}
              yAxisLabel="Visits"
              seriesLabel="Visits"
            />
          </ChartCard>
          <ChartCard
            title="By customer"
            isLoading={
              hasVisitClientFilters
                ? visitsListQuery.isLoading
                : visitsQuery.isLoading
            }
            isError={
              hasVisitClientFilters
                ? visitsListQuery.isError
                : visitsQuery.isError
            }
            onRetry={() => {
              if (hasVisitClientFilters) void visitsListQuery.refetch();
              else void visitsQuery.refetch();
            }}
          >
            <ReportsNamedBarChart
              data={toNamedBars(
                filteredVisitSeries?.byCustomer ?? visitsQuery.data?.byCustomer
              )}
              fill={REPORTS_CHART_AMBER}
              yAxisLabel="Visits"
              seriesLabel="Visits"
            />
          </ChartCard>
          <ChartCard
            title="By customer type"
            isLoading={
              hasVisitClientFilters
                ? visitsListQuery.isLoading
                : visitsQuery.isLoading
            }
            isError={
              hasVisitClientFilters
                ? visitsListQuery.isError
                : visitsQuery.isError
            }
            onRetry={() => {
              if (hasVisitClientFilters) void visitsListQuery.refetch();
              else void visitsQuery.refetch();
            }}
          >
            <ReportsNamedBarChart
              data={toNamedBars(
                filteredVisitSeries?.byCustomerType ??
                  visitsQuery.data?.byCustomerType
              )}
              fill={REPORTS_CHART_RED}
              yAxisLabel="Visits"
              seriesLabel="Visits"
            />
          </ChartCard>
        </div>
      </ReportsSection>

      <ReportsSection
        title="Attendance"
        description={`Payroll and month-to-date hours, attendance rate (ACR), and times — plus hours vs expected ${monthLabel}.`}
      >
        <div className="mb-4">
          <ChartCard
            title="Attendance metrics"
            description={`${payrollPeriodLabel} · ${monthMetricsLabel}`}
            isLoading={attendanceMetricsLoading}
            isError={attendanceMetricsError}
            onRetry={refetchAttendanceMetrics}
            contentClassName="pt-0"
          >
            <ReportsAttendanceMetricsPanel
              payrollLabel={payrollPeriodLabel}
              monthLabel={monthMetricsLabel}
              hours={{
                today: singleUserAttMetrics?.totalHours?.today,
                thisWeek: singleUserAttMetrics?.totalHours?.thisWeek,
                thisMonth: attendanceMonthHours,
                payrollHours: attendancePayrollHours,
              }}
              payrollTargetHours={payrollTargetHours}
              monthTargetHours={monthTargetHours}
              attendanceRate={attendanceRate}
              punctualityScore={punctualityScore}
              averageCheckIn={averageCheckIn}
              averageCheckOut={averageCheckOut}
              showLiveBuckets={showLiveHourBuckets}
            />
          </ChartCard>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title={`Hours vs target ${monthLabel}`}
            description={`${Math.round(attendanceHours)}h worked · ${Math.round(attendanceTargetHours)}h expected`}
            isLoading={attendanceQuery.isLoading}
            isError={attendanceQuery.isError}
            onRetry={() => void attendanceQuery.refetch()}
          >
            <ReportsHoursTargetCard
              workedHours={attendanceHours}
              targetHours={attendanceTargetHours}
              progress={attendanceHoursDonut.progress}
            />
          </ChartCard>
          <ChartCard
            title="Hours mix"
            description="Worked vs remaining to expected"
            isLoading={attendanceQuery.isLoading}
            isError={attendanceQuery.isError}
            onRetry={() => void attendanceQuery.refetch()}
          >
            <ReportDonutChart
              config={attendanceHoursDonut.config}
              data={attendanceHoursDonut.slices}
              centerPrimary={`${attendanceHoursDonut.progress}%`}
              centerSecondary="Of target"
            />
          </ChartCard>
          <ChartCard
            title="Hours by branch"
            isLoading={attendanceQuery.isLoading}
            isError={attendanceQuery.isError}
            onRetry={() => void attendanceQuery.refetch()}
          >
            <ReportsNamedBarChart
              data={attendanceByBranchHours}
              fill={REPORTS_CHART_GREEN}
              valueKind="hours"
              yAxisLabel="Hours"
              seriesLabel="Hours"
            />
          </ChartCard>
        </div>
      </ReportsSection>

      <ReportsSection
        title="Dispatch"
        description="Planned visit batches versus completed assignments."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Completion rate"
            description={`${dispatchCompleted} completed · ${dispatchPlanned} planned`}
            isLoading={dispatchQuery.isLoading}
            isError={dispatchQuery.isError}
            onRetry={() => void dispatchQuery.refetch()}
          >
            <div className="flex h-[224px] flex-col justify-center gap-4 px-1">
              <div className="space-y-1 text-center">
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {dispatchCompletionPct}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {dispatchInProgress} in progress · {dispatchRemaining}{' '}
                  remaining
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <ReportProgressBar value={dispatchCompletionPct} />
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-medium tabular-nums',
                    getProgressColorClasses(dispatchCompletionPct).text
                  )}
                >
                  {dispatchCompletionPct}%
                </span>
              </div>
            </div>
          </ChartCard>
          <ChartCard
            title="Status mix"
            description={`${dispatchPlanned} planned · ${dispatchCompleted} completed`}
            isLoading={dispatchQuery.isLoading}
            isError={dispatchQuery.isError}
            onRetry={() => void dispatchQuery.refetch()}
          >
            <ReportDonutChart
              config={dispatchDonut.config}
              data={dispatchDonut.slices}
              centerPrimary={`${dispatchCompletionPct}%`}
              centerSecondary="Done"
            />
          </ChartCard>
          <ChartCard
            title="By branch"
            isLoading={dispatchQuery.isLoading}
            isError={dispatchQuery.isError}
            onRetry={() => void dispatchQuery.refetch()}
          >
            <ReportsGroupedBarChart
              data={dispatchByBranch}
              categoryKey="branch"
              yAxisLabel="Dispatches"
              series={[
                {
                  key: 'planned',
                  label: 'Planned',
                  color: REPORTS_CHART_BLUE,
                },
                {
                  key: 'completed',
                  label: 'Completed',
                  color: REPORTS_CHART_GREEN,
                },
              ]}
            />
          </ChartCard>
        </div>
      </ReportsSection>
    </div>
  );
}
