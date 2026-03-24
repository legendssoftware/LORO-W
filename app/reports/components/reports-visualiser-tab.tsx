'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { endOfDay, startOfDay } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { useBranches, useCheckIns, useTokenReady, useUsers } from '@/api/hooks';
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

const VisitsMap = dynamic(
  () => import('@/components/visits-table/visits-map').then((m) => m.VisitsMap),
  { ssr: false }
);

export interface ReportsVisualiserTabProps {
  profile: SyncProfile | null | undefined;
}

export function ReportsVisualiserTab(_props: ReportsVisualiserTabProps) {
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

  const [visitsSummaryOpen, setVisitsSummaryOpen] = useState(false);
  const [visitsSummaryRunAt, setVisitsSummaryRunAt] = useState<Date | null>(null);

  const usersQuery = useUsers({ limit: 200, enabled: mounted });
  const usersList = usersQuery.data ?? [];
  const branchesQuery = useBranches({ enabled: mounted });

  const checkInsQuery = useCheckIns(
    {
      ...(useAllTime
        ? {}
        : {
            startDate: startOfDay(startDate).toISOString(),
            endDate: endOfDay(endDate).toISOString(),
          }),
      ...(selectedUserUid ? { userUid: selectedUserUid } : {}),
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
      />
      <div className="min-h-[500px] h-[70vh] overflow-hidden flex flex-col">
        {checkInsQuery.isLoading ? (
          <LoadingSpinner wrapperClassName="py-12 flex-1" />
        ) : (
          <VisitsMap visits={filteredCheckIns} className="flex-1 min-h-0" />
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
