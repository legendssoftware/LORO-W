'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { ConditionalAppHeader } from '@/components/conditional-app-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { AccessGuard } from '@/components/access-guard';
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

export function ConditionalLayoutShellInner({ children }: { children: ReactNode }) {
  const { pendingBlockingWarning } = usePerformanceWarningPendingSafe();
  const blockChrome = pendingBlockingWarning ? 'pointer-events-none select-none' : '';

  return (
    <div className="flex h-svh w-full">
      <div className={blockChrome}>
        <AppSidebar />
      </div>
      <div className={`flex flex-1 flex-col min-w-0 min-h-0 bg-sidebar ${blockChrome}`}>
        <ConditionalAppHeader />
        <SalesWelcomeFlow />
        <DashboardAttendanceTour />
        <LeadsTour />
        <VisitsTour />
        <StaffTour />
        <ClientsTour />
        <PipelineTour />
        <PlanningTour />
        <SettingsTour />
        <ErrorBoundary>
          <AccessGuard>
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">{children}</div>
          </AccessGuard>
        </ErrorBoundary>
      </div>
    </div>
  );
}
