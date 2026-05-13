'use client';

import { SalesBenchmarksWelcomeDialog } from '@/components/sales-benchmarks-welcome-dialog';
import { PerformanceWarningWelcomeDialog } from '@/components/performance-warning-welcome-dialog';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { useSessionStore } from '@/store/session-store';
import { isGeneralWorkerWorkforce } from '@/lib/workforce-guards';

export function SalesWelcomeFlow() {
  const profile = useSessionStore((s) => s.profileData);
  const isGeneralWorker = isGeneralWorkerWorkforce(profile?.workforceType);
  const { pendingBlockingWarning, deferToursAndSalesBenchmarks, targetWarnings, userRef, employeeName } =
    usePerformanceWarningPendingSafe();

  return (
    <>
      <PerformanceWarningWelcomeDialog
        flowActive={pendingBlockingWarning}
        userRef={userRef}
        employeeName={employeeName}
        targetWarnings={targetWarnings}
      />
      {!isGeneralWorker && (
        <SalesBenchmarksWelcomeDialog deferForPendingWarning={deferToursAndSalesBenchmarks} />
      )}
    </>
  );
}
