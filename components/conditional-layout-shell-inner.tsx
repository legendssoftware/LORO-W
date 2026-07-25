'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { ConditionalAppHeader } from '@/components/conditional-app-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { AccessGuard } from '@/components/access-guard';
import { PostAuthRouteHandler } from '@/components/post-auth-route-handler';
import { SalesWelcomeFlow } from '@/components/sales-welcome-flow';
import { DashboardAttendanceTour } from '@/components/dashboard-attendance-tour';
import { LeadsTour } from '@/components/leads-tour';
import { VisitsTour } from '@/components/visits-tour';
import { StaffTour } from '@/components/staff-tour';
import { ClientsTour } from '@/components/clients-tour';
import { PipelineTour } from '@/components/pipeline-tour';
import { PlanningTour } from '@/components/planning-tour';
import { SettingsTour } from '@/components/settings-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { useSessionSync } from '@/api/hooks';
import { isClientPortalUser } from '@/lib/access';
import { cn } from '@/lib/utils';

export function ConditionalLayoutShellInner({ children }: { children: ReactNode }) {
  const { pendingBlockingWarning } = usePerformanceWarningPendingSafe();
  const { backendUserData: profile } = useSessionSync();
  const isClient = isClientPortalUser(profile?.accessLevel);
  const blockChrome = pendingBlockingWarning;

  return (
    <div className="flex h-svh w-full">
      <div
        className={cn(blockChrome && 'pointer-events-none select-none')}
        inert={blockChrome || undefined}
        aria-hidden={blockChrome || undefined}
      >
        <AppSidebar />
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-sidebar">
        {/* Warning dialog must stay outside inert so the acknowledge CTA remains usable. */}
        {!isClient && <SalesWelcomeFlow />}
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col',
            blockChrome && 'pointer-events-none select-none'
          )}
          inert={blockChrome || undefined}
          aria-hidden={blockChrome || undefined}
        >
          <ConditionalAppHeader />
          {!isClient && (
            <>
              <DashboardAttendanceTour />
              <LeadsTour />
              <VisitsTour />
              <StaffTour />
              <ClientsTour />
              <PipelineTour />
              <PlanningTour />
              <SettingsTour />
            </>
          )}
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
