'use client';

import { usePathname } from 'next/navigation';
import { DashboardSidebar } from '@/components/sidebar/dashboard-sidebar';
import { ConditionalAppHeader } from '@/components/conditional-app-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { AccessGuard } from '@/components/access-guard';

/** Routes that use full document flow (window scroll) instead of the fixed viewport dashboard shell. */
const FULL_DOCUMENT_ROUTES = ['/', '/sign-in', '/sign-up', '/onboarding', '/forgot-password'];

function isFullDocumentRoute(pathname: string): boolean {
  return FULL_DOCUMENT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

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
    <div className="flex h-svh">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-sidebar pt-10">
        <ConditionalAppHeader />
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
