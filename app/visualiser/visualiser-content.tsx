'use client';

import { useAuth } from '@clerk/nextjs';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';

export function VisualiserContent() {
  const { isSignedIn } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <main className="w-full max-w-none px-2 py-3 sm:px-4 sm:py-4 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="mb-2 shrink-0">
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
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
              <div className="max-w-md space-y-2">
                <p className="text-base font-medium text-foreground">
                  Reports are being rebuilt
                </p>
                <p className="text-sm text-muted-foreground">
                  The competitor map and reporting APIs are temporarily
                  unavailable while we rewrite them on the server.
                </p>
              </div>
            </div>
          ) : (
            <LoadingSpinner wrapperClassName="py-12" />
          )}
        </div>
      </main>
    </div>
  );
}
