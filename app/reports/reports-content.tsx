'use client';

import { Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
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

export function ReportsContent() {
  return (
    <div className={appPageScrollWrapClass} data-tour="reports-page">
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
        <div
          className="mb-6 flex shrink-0 flex-col gap-1"
          data-tour="reports-page-header"
        >
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Reports</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Performance targets and achievement across your team.
          </p>
        </div>

        <Tabs defaultValue="targets" className="flex min-h-0 flex-1 flex-col">
          <TabsList className={reportsTabListClass} data-tour="reports-tabs">
            <TabsTrigger value="targets" className={reportsTabTriggerClass}>
              <Target className="size-4 shrink-0" aria-hidden />
              Targets
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="targets"
            className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
          >
            <ReportsOverviewTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
