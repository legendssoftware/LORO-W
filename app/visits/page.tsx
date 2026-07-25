'use client';

import { useState } from 'react';
import {
  VisitsSummaryModal,
  type VisitsSummaryModalPayload,
} from '@/app/visits/visits-summary-modal';
import { VisitsContent } from './visits-content';

export default function VisitsPage() {
  const [visitsSummaryOpen, setVisitsSummaryOpen] = useState(false);
  const [visitsSummaryRunAt, setVisitsSummaryRunAt] = useState<Date | null>(null);
  const [visitsSummarySnapshot, setVisitsSummarySnapshot] =
    useState<VisitsSummaryModalPayload | null>(null);

  function handleRequestVisitsSummary(payload: VisitsSummaryModalPayload) {
    setVisitsSummaryRunAt(new Date());
    setVisitsSummarySnapshot(payload);
    setVisitsSummaryOpen(true);
  }

  function handleVisitsSummaryOpenChange(open: boolean) {
    setVisitsSummaryOpen(open);
  }

  return (
    <>
      <VisitsContent onRequestVisitsSummary={handleRequestVisitsSummary} />
      <VisitsSummaryModal
        open={visitsSummaryOpen}
        onOpenChange={handleVisitsSummaryOpenChange}
        runAt={visitsSummaryRunAt}
        checkIns={visitsSummarySnapshot?.checkIns ?? []}
        startDate={visitsSummarySnapshot?.startDate ?? new Date(0)}
        endDate={visitsSummarySnapshot?.endDate ?? new Date(0)}
        companyName={visitsSummarySnapshot?.companyName ?? 'Organisation'}
        useAllTime={visitsSummarySnapshot?.useAllTime ?? false}
      />
    </>
  );
}
