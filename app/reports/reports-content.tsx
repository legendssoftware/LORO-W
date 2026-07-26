'use client';

import { useState } from 'react';
import { LayoutDashboard, Target } from 'lucide-react';
import { useSessionSync } from '@/api/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getReportsDataScope } from '@/lib/access';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { ReportsDashboardTab } from './components/reports-dashboard-tab';
import { ReportsOverviewTab } from './components/reports-overview-tab';

const reportsTabListClass =
  'mb-4 h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0 text-muted-foreground';

const reportsTabTriggerClass = cn(
  'relative inline-flex h-auto items-center gap-2 rounded-none border-0 border-b-2 border-transparent',
  'bg-transparent px-3 pb-2.5 pt-1.5 text-sm font-medium text-muted-foreground shadow-none',
  'ring-offset-background transition-colors',
  'hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'data-[state=active]:border-violet-600 data-[state=active]:bg-transparent',
  'data-[state=active]:text-foreground data-[state=active]:shadow-none'
);

function reportsSubtitle(scope: ReturnType<typeof getReportsDataScope>): string {
  switch (scope) {
    case 'org':
      return 'Org metrics across productivity, sales, leads, visits, attendance, and dispatch — plus performance targets.';
    case 'team':
      return 'Your team metrics across productivity, sales, leads, visits, attendance, and dispatch — plus performance targets.';
    case 'self':
      return 'Your metrics and performance targets for the selected period.';
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function ReportsContent() {
  const { backendUserData } = useSessionSync();
  const scope = getReportsDataScope(backendUserData?.accessLevel);
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className={appPageScrollWrapClass} data-slot="reports-page">
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
        <div
          className="mb-6 flex shrink-0 flex-col gap-1"
          data-slot="reports-page-header"
        >
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Reports
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {reportsSubtitle(scope)}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className={reportsTabListClass} data-slot="reports-tabs">
            <TabsTrigger value="overview" className={reportsTabTriggerClass}>
              <LayoutDashboard className="size-4 shrink-0" aria-hidden />
              Overview
            </TabsTrigger>
            <TabsTrigger value="targets" className={reportsTabTriggerClass}>
              <Target className="size-4 shrink-0" aria-hidden />
              Targets
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
          >
            {activeTab === 'overview' ? <ReportsDashboardTab /> : null}
          </TabsContent>

          <TabsContent
            value="targets"
            className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
          >
            {activeTab === 'targets' ? <ReportsOverviewTab /> : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
