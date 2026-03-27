'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { endOfDay, startOfDay } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import {
  useBranchMapMarkers,
  useBranches,
  useCheckIns,
  useReportsMapData,
  useTokenReady,
  useUsers,
} from '@/api/hooks';
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
import { visitExportItemsToMapMarkers } from '@/lib/utils/visit-map-coords';
import { mapCheckInsFromApi } from '@/lib/utils/visits-export';
import { useOrgName } from '@/lib/org-id-context';
import { TYPE_OF_BUSINESS_OPTIONS } from '@/lib/visit-form-utils';
import { useVisitsStore } from '@/store/visits-store';
import type { ReportsMode } from '@/app/reports/reports-content';

const ReportsVisualiserMap = dynamic(
  () => import('./reports-visualiser-map').then((m) => m.ReportsVisualiserMap),
  { ssr: false }
);

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
  const branchesQuery = useBranches({ enabled: mounted });
  const branchMarkersQuery = useBranchMapMarkers(branchesQuery.data, {
    enabled: mounted && (branchesQuery.data?.length ?? 0) > 0,
  });

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
    [checkInsQuery.data, usersList, branchesQuery.data]
  );

  const uniqueRegions = useMemo(() => getSortedUniqueRegions(checkIns), [checkIns]);

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
    () => getSortedUniqueBusinessTypes(checkIns),
    [checkIns]
  );

  const filteredCheckIns = useMemo(
    () =>
      filterVisitCheckIns(checkIns, {
        selectedRegion,
        selectedBusinessType,
        searchQuery,
      }),
    [checkIns, searchQuery, selectedRegion, selectedBusinessType]
  );

  const mapReportParams = useMemo((): GetMapReportParams => {
    const base: GetMapReportParams = {};
    const uidStr =
      reportsMode === 'self' && profile?.uid != null
        ? String(profile.uid)
        : selectedUserUid;
    if (uidStr) {
      const uid = parseInt(uidStr, 10);
      if (!Number.isNaN(uid)) base.userId = uid;
    }
    if (useAllTime) {
      base.allTime = true;
    } else {
      base.startDate = startOfDay(startDate).toISOString();
      base.endDate = endOfDay(endDate).toISOString();
    }
    return base;
  }, [useAllTime, startDate, endDate, selectedUserUid, reportsMode, profile?.uid]);

  const mapReport = useReportsMapData(mapReportParams, { enabled: mounted });
  const influenceCircles = mapReport.data?.influenceCircles ?? [];

  const mergedMapMarkers = useMemo(() => {
    const fromApi = mapReport.data?.allMarkers ?? [];
    const withoutReplaced = fromApi.filter(
      (m) => m.markerType !== 'check-in-visit' && m.markerType !== 'branch'
    );
    const fromCheckIns = visitExportItemsToMapMarkers(filteredCheckIns);
    const fromBranches = branchMarkersQuery.data ?? [];
    return [...withoutReplaced, ...fromCheckIns, ...fromBranches];
  }, [mapReport.data?.allMarkers, filteredCheckIns, branchMarkersQuery.data]);

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
        usersList={usersList}
        visitsSummaryDisabled={checkInsQuery.isLoading || filteredCheckIns.length === 0}
        onOpenVisitsSummary={handleOpenVisitsSummary}
        showMapTableToggle={false}
        showUserFilter={reportsMode === 'org'}
      />
      <div className="min-h-[500px] h-[70vh] overflow-hidden flex flex-col">
        {mapReport.isLoading ? (
          <LoadingSpinner wrapperClassName="py-12 flex-1" />
        ) : mapReport.isError ? (
          <p className="text-sm text-destructive text-center py-8 flex-1">
            {mapReport.error?.message ?? 'Could not load map data.'}
          </p>
        ) : (
          <ReportsVisualiserMap
            allMarkers={mergedMapMarkers}
            influenceCircles={influenceCircles}
            className="flex-1 min-h-0"
          />
        )}
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
