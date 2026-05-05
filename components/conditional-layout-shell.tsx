'use client';

import { usePathname } from 'next/navigation';
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
import { isFullDocumentRoute } from '@/lib/app-shell-routes';

/**
 * Renders the dashboard shell (sidebar + fixed viewport + overflow-y-auto) only for app routes.
 * For landing, sign-in, sign-up, etc., renders only children so the document scrolls normally
 * and no extra space is created below the footer.
 */
export function ConditionalLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useFullDocument = isFullDocumentRoute(pathname ?? '');

  if (useFullDocument) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-svh w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-sidebar">
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
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {children}
            </div>
          </AccessGuard>
        </ErrorBoundary>
      </div>
    </div>
  );
}
