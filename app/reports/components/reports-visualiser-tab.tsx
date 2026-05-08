'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { endOfDay, startOfDay } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { useBranches, useCheckIns, useReportsMapData, useTokenReady, useUsers } from '@/api/hooks';
import type { GetMapReportParams } from '@/api/endpoints/map';
import type { SyncProfile } from '@/api/types';
import { VisitsSummaryModal } from '@/app/reports/visits-summary-modal';
import { LoadingSpinner } from '@/components/loading-spinner';
import { VisitHistoryToolbar } from '@/components/visits-table/visit-history-toolbar';
import {
  filterVisitCheckIns,
  getSortedUniqueBusinessTypes,
  getSortedUniqueRegions,
} from '@/lib/utils/visit-history-filters';
import { mapCheckInsFromApi } from '@/lib/utils/visits-export';
import { useOrgName } from '@/lib/org-id-context';
import { TYPE_OF_BUSINESS_OPTIONS } from '@/lib/visit-form-utils';
import { useVisitsStore } from '@/store/visits-store';
import type { ReportsMode } from '@/app/reports/reports-content';
import {
  buildReportingUserUidSet,
  filterVisitExportItemsByReportingUserUids,
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';

const ReportsVisualiserMap = dynamic(
  () => import('./reports-visualiser-map').then((m) => m.ReportsVisualiserMap),
  { ssr: false }
);
const ALLOWED_INFLUENCE_KINDS = new Set([
  'organisation',
  'organization',
  'org',
  'client',
  'competitor',
]);

export interface ReportsVisualiserTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsVisualiserTab({
  profile,
  reportsMode,
}: ReportsVisualiserTabProps) {
  const { isLoaded: authLoaded } = useAuth();
  const { isTokenReady } = useTokenReady();
  const orgName = useOrgName();
  const mounted = authLoaded && isTokenReady;

  const {
    startDate,
    endDate,
    useAllTime,
    selectedRegion,
    selectedBusinessType,
    selectedUserUid,
    searchQuery,
  } = useVisitsStore();
  const setStoreUserUid = useVisitsStore((s) => s.setSelectedUserUid);

  useEffect(() => {
    if (reportsMode !== 'self' || profile?.uid == null) return;
    setStoreUserUid(String(profile.uid));
  }, [reportsMode, profile?.uid, setStoreUserUid]);

  const [visitsSummaryOpen, setVisitsSummaryOpen] = useState(false);
  const [visitsSummaryRunAt, setVisitsSummaryRunAt] = useState<Date | null>(null);

  const usersQuery = useUsers({
    limit: 200,
    enabled: mounted && reportsMode === 'org',
  });
  const usersList = usersQuery.data ?? [];

  const reportingUsers = useMemo(
    () =>
      reportsMode === 'org'
        ? usersList.filter(userListItemInLeadsVisitsReportingCohort)
        : usersList,
    [reportsMode, usersList]
  );

  const reportingUidSet = useMemo(
    () => buildReportingUserUidSet(reportingUsers),
    [reportingUsers]
  );

  useEffect(() => {
    if (reportsMode !== 'org' || !selectedUserUid) return;
    const ok = reportingUsers.some((u) => String(u.uid) === selectedUserUid);
    if (!ok) setStoreUserUid('');
  }, [reportsMode, reportingUsers, selectedUserUid, setStoreUserUid]);
  const branchesQuery = useBranches({ enabled: mounted });

  const checkInUserUid =
    reportsMode === 'self' && profile?.uid != null
      ? String(profile.uid)
      : selectedUserUid || undefined;

  const checkInsQuery = useCheckIns(
    {
      ...(useAllTime
        ? {}
        : {
            startDate: startOfDay(startDate).toISOString(),
            endDate: endOfDay(endDate).toISOString(),
          }),
      ...(checkInUserUid ? { userUid: checkInUserUid } : {}),
    },
    { enabled: mounted }
  );

  const checkIns = useMemo(
    () =>
      mapCheckInsFromApi(
        checkInsQuery.data?.checkIns ?? [],
        usersList,
        branchesQuery.data ?? []
      ),
    [branchesQuery.data, checkInsQuery.data, usersList]
  );

  const checkInsForOrgReporting = useMemo(() => {
    if (reportsMode !== 'org' || checkInUserUid) return checkIns;
    return filterVisitExportItemsByReportingUserUids(
      checkIns,
      reportingUidSet,
      true
    );
  }, [checkIns, reportsMode, checkInUserUid, reportingUidSet]);

  const uniqueRegions = useMemo(
    () => getSortedUniqueRegions(checkInsForOrgReporting),
    [checkInsForOrgReporting]
  );

  const businessTypeLabelMap = useMemo(
    () => new Map(TYPE_OF_BUSINESS_OPTIONS.map((o) => [o.value, o.label])),
    []
  );
  const businessTypeIconMap = useMemo(() => {
    const m = new Map(TYPE_OF_BUSINESS_OPTIONS.map((o) => [o.value, o.icon]));
    m.set('Not set', MoreHorizontal);
    return m;
  }, []);

  const uniqueBusinessTypes = useMemo(
    () => getSortedUniqueBusinessTypes(checkInsForOrgReporting),
    [checkInsForOrgReporting]
  );

  const filteredCheckIns = useMemo(
    () =>
      filterVisitCheckIns(checkInsForOrgReporting, {
        selectedRegion,
        selectedBusinessType,
        searchQuery,
      }),
    [
      checkInsForOrgReporting,
      searchQuery,
      selectedRegion,
      selectedBusinessType,
    ]
  );

  /** Align map window with visits toolbar dates; skip reverse-geocode (no attendance layer). */
  const mapReportParams = useMemo((): GetMapReportParams => {
    const base: GetMapReportParams = { resolveMarkerAddresses: false };
    const uidStr =
      reportsMode === 'self' && profile?.uid != null ? String(profile.uid) : selectedUserUid;
    if (uidStr) {
      const uid = parseInt(uidStr, 10);
      if (!Number.isNaN(uid)) base.userId = uid;
    }
    if (useAllTime) base.allTime = true;
    else {
      base.startDate = startOfDay(startDate).toISOString();
      base.endDate = endOfDay(endDate).toISOString();
    }
    return base;
  }, [
    useAllTime,
    startDate,
    endDate,
    selectedUserUid,
    reportsMode,
    profile,
  ]);

  const mapReport = useReportsMapData(mapReportParams, { enabled: mounted });
  const influenceCircles = mapReport.data?.influenceCircles ?? [];
  const filteredInfluenceCircles = useMemo(
    () =>
      influenceCircles.filter((circle) =>
        ALLOWED_INFLUENCE_KINDS.has(
          String(circle.kind ?? circle.markerType ?? '').toLowerCase()
        )
      ),
    [influenceCircles]
  );

  const mapMarkers = useMemo(
    () => mapReport.data?.allMarkers ?? [],
    [mapReport.data?.allMarkers]
  );

  const handleOpenVisitsSummary = () => {
    setVisitsSummaryRunAt(new Date());
    setVisitsSummaryOpen(true);
  };

  if (!mounted) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  return (
    <section className="flex flex-col min-h-0">
      <VisitHistoryToolbar
        uniqueRegions={uniqueRegions}
        uniqueBusinessTypes={uniqueBusinessTypes}
        businessTypeLabelMap={businessTypeLabelMap}
        businessTypeIconMap={businessTypeIconMap}
        usersList={reportingUsers}
        visitsSummaryDisabled={checkInsQuery.isLoading || filteredCheckIns.length === 0}
        onOpenVisitsSummary={handleOpenVisitsSummary}
        showMapTableToggle={false}
        showUserFilter={reportsMode === 'org'}
      />
      <div className="min-h-[500px] h-[70vh] overflow-hidden flex flex-col relative">
        {mapReport.isError ? (
          <p
            className="absolute left-0 right-0 top-0 z-[2001] mx-auto max-w-lg rounded-b-md border-x border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            {mapReport.error?.message ?? 'Could not load map data.'}
          </p>
        ) : null}
        <ReportsVisualiserMap
          allMarkers={mapMarkers}
          influenceCircles={filteredInfluenceCircles}
          mapLayerBusy={mapReport.isFetching && !mapReport.isError}
          className="flex-1 min-h-0"
        />
      </div>

      <VisitsSummaryModal
        open={visitsSummaryOpen}
        onOpenChange={setVisitsSummaryOpen}
        checkIns={filteredCheckIns}
        startDate={startDate}
        endDate={endDate}
        runAt={visitsSummaryRunAt}
        companyName={orgName ?? 'Organisation'}
        useAllTime={useAllTime}
      />
    </section>
  );
}
