'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useApiClient,
  useBranches,
  useEngagementRange,
  useSessionSync,
  useTeamTargets,
  useTokenReady,
  useUser,
} from '@/api/hooks';
import { downloadTravelExport } from '@/api/endpoints/reports-travel-export';
import { Skeleton } from '@/components/ui/skeleton';
import { getReportsDataScope } from '@/lib/access';
import {
  REPORTS_USERS_QUERY_KEY,
  resolveReportsAllowlistUids,
  userUidInAllowlist,
  fetchReportsOrgUsers,
} from '../lib/reports-scope-allowlist';
import { userIdsMatchingBranch } from '../lib/reports-user-branch';
import { useReportsDateRange } from '../lib/use-reports-date-range';
import {
  engagementTotals,
  REPORTS_CHART_AMBER,
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
  teamMemberSalesBars,
} from '../lib/reports-dashboard-chart-helpers';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsGroupedBarChart } from './reports-grouped-bar-chart';
import { ReportsSalesTargetRadialChart } from './reports-sales-target-radial-chart';
import { ReportsConversionRateRadialChart } from './reports-conversion-rate-radial-chart';
import { ReportsSection } from './reports-section';
import { ReportsUserTargetBars } from './reports-user-target-bars';
import { ReportsChartCard } from './reports-chart-card';

export function ReportsProductivityTab() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const client = useApiClient();
  const accessLevel = backendUserData?.accessLevel;
  const scope = getReportsDataScope(accessLevel);
  const isMultiUser = scope !== 'self';
  const showTeamCharts = scope === 'org' || scope === 'team';
  const selfRef =
    backendUserData?.clerkUserId?.trim() ||
    (backendUserData?.uid != null ? String(backendUserData.uid) : null);

  const { startDate, endDate, from, to, setRange } = useReportsDateRange();
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [travelExportLoading, setTravelExportLoading] = useState(false);

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

  const rangeParams = useMemo(
    () => ({
      from,
      to,
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
    }),
    [from, to, branchIdFilter]
  );

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
    queryFn: () => fetchReportsOrgUsers(client),
    enabled: enabled && isMultiUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const allowlistedUsers = useMemo(
    () =>
      (usersQuery.data ?? []).filter((u) =>
        userUidInAllowlist(u.uid, allowlistUids)
      ),
    [usersQuery.data, allowlistUids]
  );

  const branchScopedUserIds = useMemo(
    () => userIdsMatchingBranch(allowlistedUsers, branchIdFilter),
    [allowlistedUsers, branchIdFilter]
  );

  const selectedBranch = useMemo(
    () =>
      branchIdFilter != null
        ? (branchesQuery.data ?? []).find((b) => b.uid === branchIdFilter) ??
          null
        : null,
    [branchesQuery.data, branchIdFilter]
  );

  const branchFilterPending =
    branchIdFilter != null &&
    ((branchesQuery.isLoading && selectedBranch == null) ||
      (!usersQuery.isSuccess && usersQuery.data == null));

  const engagementQuery = useEngagementRange(rangeParams, { enabled });
  const teamTargetsQuery = useTeamTargets({
    enabled: enabled && showTeamCharts,
  });

  const productivityGrouped = useMemo(() => {
    let users = engagementQuery.data?.users ?? [];
    if (allowlistUids != null) {
      users = users.filter((u) => userUidInAllowlist(u.uid, allowlistUids));
    }
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
      data-tour="reports-productivity-tab"
    >
      <ReportsDashboardToolbar
        startDate={startDate}
        endDate={endDate}
        onRangeChange={setRange}
        showDimensionFilters={isMultiUser}
        branches={branchesQuery.data ?? []}
        users={allowlistedUsers}
        selectedBranchId={branchFilter}
        onBranchChange={(id) => {
          setBranchFilter(id);
          setUserFilter('all');
        }}
        selectedUserId={userFilter}
        onUserChange={setUserFilter}
        selectedCountry={countryFilter}
        onCountryChange={setCountryFilter}
        onExportTravel={async () => {
          if (travelExportLoading) return;
          setTravelExportLoading(true);
          try {
            await downloadTravelExport(client, {
              from,
              to,
              ...(userIdFilter != null ? { userUid: userIdFilter } : {}),
              ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
            });
          } finally {
            setTravelExportLoading(false);
          }
        }}
        travelExportLoading={travelExportLoading}
      />

      <ReportsSection
        title="Productivity"
        description="Calls, visits, leads, and sales target progress across the selected period."
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <ReportsChartCard
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
          </ReportsChartCard>
          <ReportsChartCard
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
          </ReportsChartCard>
          {showTeamCharts ? (
            <ReportsChartCard
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
            </ReportsChartCard>
          ) : (
            <ReportsChartCard title="Period" description="Selected report window">
              <div className="flex h-[224px] flex-col items-center justify-center gap-1 text-center">
                <p className="text-2xl font-semibold tabular-nums">{from}</p>
                <p className="text-sm text-muted-foreground">to</p>
                <p className="text-2xl font-semibold tabular-nums">{to}</p>
              </div>
            </ReportsChartCard>
          )}
          {showTeamCharts ? (
            <ReportsChartCard
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
            </ReportsChartCard>
          ) : null}
        </div>
      </ReportsSection>
    </div>
  );
}
