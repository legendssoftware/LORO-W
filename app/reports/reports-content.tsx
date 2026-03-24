'use client';

import { useAuth } from '@clerk/nextjs';
import { useTokenReady, useSessionSync } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isStaffDashboardVisible } from '@/lib/access';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const REPORT_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'visits', label: 'Visits' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'leads', label: 'Leads' },
  { value: 'planning', label: 'Planning' },
  { value: 'sales', label: 'Sales' },
] as const;

function ReportsPlaceholderPanel() {
  return (
    <p className="text-center text-muted-foreground py-12">Reports coming soon</p>
  );
}

export function ReportsContent() {
  const { isSignedIn } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const isStaff = isStaffDashboardVisible(profile?.accessLevel);
  const isVisitsAdmin = profile?.accessLevel?.toLowerCase() === 'admin';

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
        <h1 className="text-2xl font-semibold text-foreground mb-6 shrink-0">
          Reports
        </h1>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!isSignedIn || !isTokenReady ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : profile && !isStaff ? (
            <p className="text-center text-muted-foreground py-12">
              Reports are available to staff only.
            </p>
          ) : isVisitsAdmin ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="h-auto w-full flex flex-wrap justify-start gap-4 bg-transparent p-0 sm:gap-6">
                {REPORT_TABS.map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="shrink-0 rounded-md border-0 bg-transparent px-4 py-2 text-sm font-medium text-zinc-500 shadow-none ring-0 transition-colors hover:bg-transparent hover:text-zinc-700 focus-visible:ring-violet-500/40 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:hover:bg-violet-700 data-[state=active]:hover:text-white dark:text-zinc-400 dark:hover:text-zinc-300 dark:data-[state=active]:bg-violet-600 dark:data-[state=active]:text-white"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {REPORT_TABS.map(({ value }) => (
                <TabsContent key={value} value={value}>
                  <ReportsPlaceholderPanel />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Reports are available to admin only.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
