'use client';

import { useAuth } from '@clerk/nextjs';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import { ReportsVisualiserTab } from '@/app/reports/components/reports-visualiser-tab';
import type { ReportsMode } from '@/app/reports/reports-mode';
import { useVisualiserPrefetch } from '@/app/visualiser/use-visualiser-prefetch';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isReportsElevatedViewer } from '@/lib/access';

export function VisualiserContent() {
  const { isSignedIn } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const reportsMode: ReportsMode = isReportsElevatedViewer(
    profile?.accessLevel
  )
    ? 'org'
    : 'self';

  const ready = Boolean(isSignedIn && isTokenReady && profile);

  useVisualiserPrefetch({
    enabled: ready,
    reportsMode,
    profile,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <main className="container mx-auto max-w-8xl px-3 py-4 sm:px-6 sm:py-6 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-semibold text-foreground">
            Competitor Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Map competitors, branches, and clients for store planning and
            territory insight.
          </p>
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {!isSignedIn || !isTokenReady ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : profile ? (
            <ReportsVisualiserTab profile={profile} reportsMode={reportsMode} />
          ) : (
            <LoadingSpinner wrapperClassName="py-12" />
          )}
        </div>
      </main>
    </div>
  );
}
