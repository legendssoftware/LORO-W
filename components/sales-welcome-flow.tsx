'use client';

import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { useUserTarget } from '@/api/hooks';
import type { UserTargetDashboardShape } from '@/api/endpoints/user';
import { SalesBenchmarksWelcomeDialog } from '@/components/sales-benchmarks-welcome-dialog';
import { PerformanceWarningWelcomeDialog } from '@/components/performance-warning-welcome-dialog';
import { isFullDocumentRoute } from '@/lib/app-shell-routes';

export function SalesWelcomeFlow() {
  const pathname = usePathname() ?? '';
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const profile = useSessionStore((s) => s.profileData);
  const userRef = profile?.uid != null ? String(profile.uid) : null;

  const targetQuery = useUserTarget(userRef, {
    enabled: !!userRef && !!isSignedIn,
  });

  const userTarget = targetQuery.data?.userTarget as UserTargetDashboardShape | null | undefined;
  const tw = userTarget?.personalTargets?.targetWarnings;

  const pendingWarning =
    targetQuery.isSuccess &&
    !!tw &&
    typeof tw.level === 'number' &&
    tw.level > (tw.acknowledgedLevel ?? 0);

  const inAppShell = !isFullDocumentRoute(pathname);
  const isDashboard = pathname === '/dashboard';
  const flowBase =
    isLoaded && isSignedIn && !!sessionId && inAppShell && isDashboard && !!userRef;

  const targetReady = targetQuery.isFetched && !targetQuery.isLoading;
  const employeeName = [profile?.name, profile?.surname].filter(Boolean).join(' ').trim();

  return (
    <>
      <PerformanceWarningWelcomeDialog
        flowActive={flowBase && targetReady}
        userRef={userRef}
        employeeName={employeeName || 'there'}
        targetWarnings={tw}
      />
      <SalesBenchmarksWelcomeDialog deferForPendingWarning={!!(flowBase && targetReady && pendingWarning)} />
    </>
  );
}
