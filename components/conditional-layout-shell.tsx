'use client';

import { usePathname } from 'next/navigation';
import { PerformanceWarningGateProvider } from '@/contexts/performance-warning-pending-context';
import { ConditionalLayoutShellInner } from '@/components/conditional-layout-shell-inner';
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
    return <div className="w-full min-w-0 flex-1">{children}</div>;
  }

  return (
    <PerformanceWarningGateProvider>
      <ConditionalLayoutShellInner>{children}</ConditionalLayoutShellInner>
    </PerformanceWarningGateProvider>
  );
}
