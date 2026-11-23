'use client';

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { ConditionalAppHeader } from '@/components/conditional-app-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { AccessGuard } from '@/components/access-guard';
import { PostAuthRouteHandler } from '@/components/post-auth-route-handler';
import { SalesWelcomeFlow } from '@/components/sales-welcome-flow';
import { RouteTours } from '@/components/route-tours';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { useSessionSync } from '@/api/hooks';
import { isClientPortalUser } from '@/lib/access';
import { cn } from '@/lib/utils';

function stopBlockedKeys(event: KeyboardEvent<HTMLDivElement>): void {
  event.preventDefault();
  event.stopPropagation();
}

export function ConditionalLayoutShellInner({ children }: { children: ReactNode }) {
  const { pendingBlockingWarning } = usePerformanceWarningPendingSafe();
  const { backendUserData: profile } = useSessionSync();
  const isClient = isClientPortalUser(profile?.accessLevel);
  const blockChrome = pendingBlockingWarning;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!blockChrome) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    if (sidebarRef.current?.contains(active) || mainRef.current?.contains(active)) {
      active.blur();
    }
  }, [blockChrome]);

  return (
    <div className="flex h-svh w-full" translate="no">
      <div
        ref={sidebarRef}
        className={cn(blockChrome && 'pointer-events-none select-none')}
        aria-hidden={blockChrome || undefined}
        onKeyDownCapture={blockChrome ? stopBlockedKeys : undefined}
      >
        <AppSidebar />
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-sidebar">
        {/* Dialog stays outside this region so acknowledge stays usable. `inert` is omitted:
            Chrome throws removeChild NotFoundError when React deletes nodes under an inert parent. */}
        {!isClient && <SalesWelcomeFlow />}
        <div
          ref={mainRef}
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col',
            blockChrome && 'pointer-events-none select-none'
          )}
          aria-hidden={blockChrome || undefined}
          onKeyDownCapture={blockChrome ? stopBlockedKeys : undefined}
        >
          <ConditionalAppHeader />
          <RouteTours />
          <PostAuthRouteHandler />
          <ErrorBoundary>
            <AccessGuard>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
            </AccessGuard>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
