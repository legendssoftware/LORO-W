'use client';

import { useMemo, useState } from 'react';
import { HeartPulse, LayoutDashboard, Sparkles, TrendingUp } from 'lucide-react';
import { useBranches, useSessionSync, useTokenReady } from '@/api/hooks';
import {
  usePulseCorrelations,
  usePulseDaily,
  usePulseExecutive,
  usePulseInsights,
} from '@/api/hooks/use-pulse';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { canAccessWellbeingDashboard } from '@/lib/access';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { ReportsDashboardToolbar } from '@/app/reports/components/reports-dashboard-toolbar';
import { useReportsDateRange } from '@/app/reports/lib/use-reports-date-range';
import { WellbeingRadialIndex } from './components/wellbeing-radial-index';
import type { PulseNamedPerson } from '@/api/types/pulse';

const tabListClass =
  'mb-4 h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0 text-muted-foreground';
const tabTriggerClass = cn(
  'relative inline-flex h-auto items-center gap-2 rounded-none border-0 border-b-2 border-transparent',
  'bg-transparent px-3 pb-2.5 pt-1.5 text-sm font-medium text-muted-foreground shadow-none',
  'data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground'
);

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function moodLabel(mood: string | null | undefined): string {
  if (!mood) return '—';
  return mood.replaceAll('_', ' ');
}

function NamedList({ title, rows }: { title: string; rows: PulseNamedPerson[] }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.ownerUid} className="rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium">
              {row.name}
              {row.branchName ? ` · ${row.branchName}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Morning: {moodLabel(row.morningMood)} · Evening: {moodLabel(row.eveningMood)}
              {row.riskReason ? ` · ${row.riskReason.replaceAll('_', ' ')}` : ''}
            </p>
            {row.comments ? <p className="mt-1 text-xs">{row.comments}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function WellbeingContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const allowed = canAccessWellbeingDashboard(backendUserData?.accessLevel);
  const range = useReportsDateRange();
  const [branchId, setBranchId] = useState('all');
  const [tab, setTab] = useState('today');
  const branches = useBranches({ enabled: isTokenReady && allowed });
  const branchUid = branchId && branchId !== 'all' ? Number(branchId) : undefined;
  const daily = usePulseDaily({ branchUid }, isTokenReady && allowed && tab === 'today');
  const insights = usePulseInsights(
    { from: range.from, to: range.to, branchUid },
    isTokenReady && allowed && tab === 'insights'
  );
  const executive = usePulseExecutive(
    { from: range.from, to: range.to, branchUid },
    isTokenReady && allowed && tab === 'executive'
  );
  const correlations = usePulseCorrelations(
    { from: range.from, to: range.to, branchUid },
    isTokenReady && allowed && tab === 'correlations'
  );

  const branchOptions = useMemo(() => branches.data ?? [], [branches.data]);

  if (!allowed) {
    return (
      <div className={appPageScrollWrapClass}>
        <main className={appPageMainClass}>
          <p className="text-sm text-muted-foreground">Wellbeing is limited to managers, HR, and executives.</p>
        </main>
      </div>
    );
  }

  return (
    <div className={appPageScrollWrapClass} data-slot="wellbeing-page">
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
        <div className="mb-6 flex shrink-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Wellbeing</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Daily employee pulse, named follow-ups for your team, and mood vs performance estimates.
          </p>
        </div>
        <ReportsDashboardToolbar
          startDate={range.startDate}
          endDate={range.endDate}
          onRangeChange={range.setRange}
          showDimensionFilters
          branches={branchOptions}
          selectedBranchId={branchId}
          onBranchChange={setBranchId}
        />
        <Tabs value={tab} onValueChange={setTab} className="mt-4 flex min-h-0 flex-1 flex-col">
          <TabsList className={tabListClass}>
            <TabsTrigger value="today" className={tabTriggerClass}>
              <LayoutDashboard className="size-4" /> Today
            </TabsTrigger>
            <TabsTrigger value="insights" className={tabTriggerClass}>
              <Sparkles className="size-4" /> Insights
            </TabsTrigger>
            <TabsTrigger value="executive" className={tabTriggerClass}>
              <HeartPulse className="size-4" /> Executive
            </TabsTrigger>
            <TabsTrigger value="correlations" className={tabTriggerClass}>
              <TrendingUp className="size-4" /> Correlations
            </TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="space-y-6">
            {daily.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="Employees checked in" value={String(daily.data?.kpis.employeesCheckedIn ?? 0)} />
                  <KpiCard
                    label="Morning mood"
                    value={daily.data?.kpis.morningMoodScore != null ? `${daily.data.kpis.morningMoodScore} / 10` : '—'}
                  />
                  <KpiCard
                    label="Evening mood"
                    value={daily.data?.kpis.eveningMoodScore != null ? `${daily.data.kpis.eveningMoodScore} / 10` : '—'}
                  />
                  <KpiCard
                    label="Daily change"
                    value={daily.data?.kpis.dailyChange != null ? String(daily.data.kpis.dailyChange) : '—'}
                  />
                  <KpiCard label="Support requests" value={String(daily.data?.kpis.supportRequests ?? 0)} />
                  <KpiCard label="High risk" value={String(daily.data?.kpis.highRiskEmployees ?? 0)} />
                  <KpiCard label="Burnout risk" value={daily.data?.kpis.burnoutRisk ?? 'Low'} />
                  <KpiCard
                    label="Confidential (count)"
                    value={String(daily.data?.confidentialSupportCount ?? 0)}
                  />
                </div>
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Branch comparison</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead>Morning</TableHead>
                        <TableHead>Evening</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(daily.data?.branches ?? []).map((row) => (
                        <TableRow key={String(row.branchUid ?? row.branchName)}>
                          <TableCell>{row.branchName}</TableCell>
                          <TableCell>{row.morningScore ?? '—'}</TableCell>
                          <TableCell>{row.eveningScore ?? '—'}</TableCell>
                          <TableCell>{row.trend === 'up' ? 'Up' : row.trend === 'down' ? 'Down' : 'Flat'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
                <NamedList title="Support queue" rows={daily.data?.supportQueue ?? []} />
                <NamedList title="Action required" rows={daily.data?.highRisk ?? []} />
              </>
            )}
          </TabsContent>
          <TabsContent value="insights" className="space-y-4">
            {insights.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{insights.data?.disclaimer}</p>
                <Badge variant="outline">{insights.data?.source === 'gemini' ? 'AI insights' : 'Deterministic'}</Badge>
                {(insights.data?.items ?? []).map((item) => (
                  <div
                    key={item.title}
                    className={cn(
                      'rounded-lg border p-3',
                      item.severity === 'positive' && 'border-emerald-200 bg-emerald-50',
                      item.severity === 'attention' && 'border-amber-200 bg-amber-50',
                      item.severity === 'action' && 'border-red-200 bg-red-50'
                    )}
                  >
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
          <TabsContent value="executive">
            {executive.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(executive.data?.indices ?? []).map((index) => (
                  <WellbeingRadialIndex key={index.label} label={index.label} value={index.value} unit={index.unit} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="correlations" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Estimates from live joins in this window. Not causal. Rows with small samples are omitted. Safety incidents are not tracked yet.
            </p>
            {correlations.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finding</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>n</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(correlations.data?.findings ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.finding}</TableCell>
                      <TableCell>{row.deltaPct != null ? `${row.deltaPct}%` : '—'}</TableCell>
                      <TableCell>{row.n}</TableCell>
                      <TableCell>{row.confidence}</TableCell>
                      <TableCell>{row.sourceLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
