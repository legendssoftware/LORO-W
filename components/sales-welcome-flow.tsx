'use client';

import { SalesBenchmarksWelcomeDialog } from '@/components/sales-benchmarks-welcome-dialog';
import { PerformanceWarningWelcomeDialog } from '@/components/performance-warning-welcome-dialog';
import { useAcknowledgePaceNotice, usePaceNotice } from '@/api/hooks';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { useSessionStore } from '@/store/session-store';
import { isGeneralWorkerWorkforce } from '@/lib/workforce-guards';

export function SalesWelcomeFlow() {
  const profile = useSessionStore((s) => s.profileData);
  const isGeneralWorker = isGeneralWorkerWorkforce(profile?.workforceType);
  const { pendingBlockingWarning, deferToursAndSalesBenchmarks, targetWarnings, userRef, employeeName } =
    usePerformanceWarningPendingSafe();
  const paceQuery = usePaceNotice(userRef, !isGeneralWorker && !pendingBlockingWarning);
  const acknowledgePace = useAcknowledgePaceNotice(userRef);
  const paceNotice = paceQuery.data?.notice ?? null;
  const paceBlocking = !isGeneralWorker && (paceQuery.isLoading || paceNotice != null);

  return (
    <>
      <PerformanceWarningWelcomeDialog
        flowActive={pendingBlockingWarning}
        userRef={userRef}
        employeeName={employeeName}
        targetWarnings={targetWarnings}
      />
      {!isGeneralWorker && paceNotice ? (
        <SalesBenchmarksWelcomeDialog
          paceNotice={paceNotice}
          onPaceAcknowledge={() => acknowledgePace.mutate()}
          paceAcknowledging={acknowledgePace.isPending}
          deferForPendingWarning={pendingBlockingWarning}
        />
      ) : null}
      {!isGeneralWorker && (
        <SalesBenchmarksWelcomeDialog
          deferForPendingWarning={deferToursAndSalesBenchmarks || paceBlocking}
        />
      )}
    </>
  );
}
