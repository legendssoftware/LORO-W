'use client';

import { useMemo } from 'react';
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import { useBonusStatus } from '@/api/hooks';
import type { BonusEligibilityStatus } from '@/api/endpoints/user';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

const PERFORMANCE_FLOOR = 90;

const chartConfig = {
  progress: {
    label: 'YTD performance',
    color: 'hsl(var(--chart-1))',
  },
  remainder: {
    label: 'To 100%',
    color: 'hsl(var(--muted))',
  },
} satisfies ChartConfig;

function statusLabel(status: BonusEligibilityStatus): string {
  switch (status) {
    case 'eligible':
      return 'Eligible';
    case 'at_risk':
      return 'At risk';
    case 'disqualified':
      return 'Disqualified';
    case 'not_applicable':
      return 'N/A';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusBadgeClass(status: BonusEligibilityStatus): string {
  switch (status) {
    case 'eligible':
      return 'border-transparent bg-emerald-600 text-white';
    case 'at_risk':
      return 'border-transparent bg-amber-500 text-white';
    case 'disqualified':
      return 'border-transparent bg-destructive text-white';
    case 'not_applicable':
      return '';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function DashboardBonusStatusCard({
  userRef,
  className,
}: {
  userRef: string | null;
  className?: string;
}) {
  const query = useBonusStatus(userRef, { enabled: !!userRef });

  const data = query.data;
  const hide =
    !userRef ||
    query.isError ||
    (query.isSuccess && (!data || data.status === 'not_applicable'));

  const ytd = data?.ytdPerformancePct ?? 0;
  const radialData = useMemo(
    () => [
      {
        name: 'ytd',
        progress: Math.min(100, Math.max(0, ytd)),
        remainder: Math.max(0, 100 - Math.min(100, Math.max(0, ytd))),
      },
    ],
    [ytd]
  );

  if (hide) return null;

  if (query.isLoading || query.isPending) {
    return (
      <Card className={cn(className)} data-tour="year-end-bonus-section">
        <CardContent className="space-y-4 px-4 pt-6 sm:px-6">
          <Skeleton className="h-4 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const today = data.today;
  const meetsFloor =
    data.ytdPerformancePct != null && data.ytdPerformancePct >= PERFORMANCE_FLOOR;

  return (
    <Card className={cn(className)} data-tour="year-end-bonus-section">
      <CardContent className="px-4 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium uppercase text-foreground">
              Year-end bonus
            </p>
            <p className="text-xs text-muted-foreground">
              {data.bonusYear.label}
              {data.position?.label ? ` · ${data.position.label}` : ''}
            </p>
          </div>
          <Badge className={statusBadgeClass(data.status)} variant="outline">
            {statusLabel(data.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-[240px]"
          >
            <RadialBarChart
              data={radialData}
              endAngle={180}
              innerRadius={70}
              outerRadius={110}
            >
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 12}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {data.ytdPerformancePct != null
                              ? `${data.ytdPerformancePct}%`
                              : '—'}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 8}
                            className="fill-muted-foreground text-xs"
                          >
                            YTD vs {PERFORMANCE_FLOOR}% min
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </PolarRadiusAxis>
              <RadialBar
                dataKey="progress"
                stackId="a"
                cornerRadius={6}
                fill={meetsFloor ? 'var(--color-progress)' : 'hsl(var(--destructive))'}
                className="stroke-transparent stroke-2"
              />
              <RadialBar
                dataKey="remainder"
                stackId="a"
                cornerRadius={6}
                fill="var(--color-remainder)"
                className="stroke-transparent stroke-2"
              />
            </RadialBarChart>
          </ChartContainer>

          <div className="space-y-3 text-sm">
            {today ? (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Today · {today.date}
                </p>
                <dl className="mt-2 space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Calls</dt>
                    <dd className="font-medium tabular-nums">
                      {today.achievedCalls}/{today.requiredCalls}
                    </dd>
                  </div>
                  {today.requiredVisits != null ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Visits</dt>
                      <dd className="font-medium tabular-nums">
                        {today.achievedVisits}/{today.requiredVisits}
                      </dd>
                    </div>
                  ) : null}
                  {today.dayPct != null ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Day progress</dt>
                      <dd className="font-medium tabular-nums">{today.dayPct}%</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Risk counters</p>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Months below 90% (streak)</dt>
                  <dd className="font-medium tabular-nums">
                    {data.consecutiveMonthsBelowMin}/3
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Low attendance streak</dt>
                  <dd className="font-medium tabular-nums">
                    {data.consecutiveMonthsLowAttendance}/3
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Excess late streak</dt>
                  <dd className="font-medium tabular-nums">
                    {data.consecutiveMonthsExcessLates}/3
                  </dd>
                </div>
              </dl>
            </div>

            {data.disqualificationReasons.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-destructive">
                {data.disqualificationReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-xs leading-snug text-muted-foreground">
          Only CRM-logged activity counts. Minimum daily requirements and year-end rules apply
          from 01 June 2026 (bonus year {data.bonusYear.start} – {data.bonusYear.end}).
        </p>
      </CardContent>
    </Card>
  );
}
