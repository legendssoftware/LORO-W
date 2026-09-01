'use client';

import { useState } from 'react';
import { useSessionSync } from '@/api/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getReportsDataScope } from '@/lib/access';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { REPORTS_TABS, reportsSubtitle } from './lib/reports-registry';

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

export function ReportsContent() {
  const { backendUserData } = useSessionSync();
  const scope = getReportsDataScope(backendUserData?.accessLevel);
  const [activeTab, setActiveTab] = useState<string>(REPORTS_TABS[0].id);

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
            {REPORTS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={reportsTabTriggerClass}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {REPORTS_TABS.map((tab) => {
            const TabComponent = tab.component;
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
              >
                {activeTab === tab.id ? <TabComponent /> : null}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
}
