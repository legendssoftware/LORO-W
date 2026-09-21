'use client';

import { useMemo } from 'react';
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import { Check, X } from 'lucide-react';
import { useVariableRemuneration } from '@/api/hooks';
import type { VariableRemStatus } from '@/api/endpoints/user';
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

const chartConfig = {
  live: {
    label: 'Live extra pay',
    color: 'hsl(var(--chart-1))',
  },
  remainder: {
    label: 'To maximum',
    color: 'hsl(var(--muted))',
  },
} satisfies ChartConfig;

function statusLabel(status: VariableRemStatus): string {
  switch (status) {
    case 'on_track':
      return 'On track';
    case 'partial':
      return 'Gates open';
    case 'earned':
      return 'Earned';
    case 'zero':
      return 'Not yet';
    case 'not_applicable':
      return 'N/A';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusBadgeClass(status: VariableRemStatus): string {
  switch (status) {
    case 'on_track':
      return 'border-transparent bg-amber-500 text-white';
    case 'earned':
      return 'border-transparent bg-emerald-600 text-white';
    case 'partial':
      return 'border-transparent bg-sky-600 text-white';
    case 'zero':
      return 'border-transparent bg-muted text-foreground';
    case 'not_applicable':
      return '';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function formatMoney(amount: number, symbol: string, code: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${code}`;
}

function formatGateActual(
  actual: number,
  unit: 'per_day' | 'percent' | 'count'
): string {
  if (unit === 'percent') return `${actual}%`;
  if (unit === 'per_day') return `${actual}/day`;
  return actual >= 1 ? 'Pass' : 'Fail';
}

export function DashboardVariableRemCard({
  userRef,
  className,
}: {
  userRef: string | null;
  className?: string;
}) {
  const query = useVariableRemuneration(userRef, { enabled: !!userRef });
  const data = query.data;
  const hide =
    !userRef ||
    query.isError ||
    (query.isSuccess && (!data || data.status === 'not_applicable'));

  const countryMax =
    (data?.variable.max ?? 0) + (data?.excellence.max ?? 0);
  const live = data?.liveTotal ?? 0;
  const radialPct =
    countryMax > 0 ? Math.min(100, Math.max(0, (100 * live) / countryMax)) : 0;

  const radialData = useMemo(
    () => [
      {
        name: 'live',
        progress: radialPct,
        remainder: Math.max(0, 100 - radialPct),
      },
    ],
    [radialPct]
  );

  if (hide) return null;

  if (query.isLoading || query.isPending) {
    return (
      <Card className={cn(className)} data-tour="variable-rem-section">
        <CardContent className="space-y-4 px-4 pt-6 sm:px-6">
          <Skeleton className="h-4 w-56" />
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

  const symbol = data.currency.symbol || '';
  const code = data.currency.code;

  return (
    <Card className={cn(className)} data-tour="variable-rem-section">
      <CardContent className="px-4 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium uppercase text-foreground">
              Variable remuneration
            </p>
            <p className="text-xs text-muted-foreground">
              {data.month}
              {data.position?.label ? ` · ${data.position.label}` : ''}
              {' · on top of commission'}
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
                            className="fill-foreground text-xl font-bold"
                          >
                            {data.amountsConfigured
                              ? formatMoney(live, symbol, code)
                              : `${data.gates.filter((g) => g.met).length}/4`}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 10}
                            className="fill-muted-foreground text-xs"
                          >
                            {data.amountsConfigured
                              ? `of ${formatMoney(countryMax, symbol, code)}`
                              : 'gates passed'}
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
                cornerRadius={5}
                fill="var(--color-live)"
                className="stroke-transparent stroke-2"
              />
              <RadialBar
                dataKey="remainder"
                stackId="a"
                cornerRadius={5}
                fill="var(--color-remainder)"
                className="stroke-transparent stroke-2"
              />
            </RadialBarChart>
          </ChartContainer>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Variable</p>
                <p className="font-medium tabular-nums">
                  {data.amountsConfigured
                    ? formatMoney(data.variable.live, symbol, code)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Excellence{data.excellence.band >= 15 ? ` · ${data.excellence.band} visits` : ''}
                </p>
                <p className="font-medium tabular-nums">
                  {data.amountsConfigured
                    ? formatMoney(data.excellence.live, symbol, code)
                    : '—'}
                </p>
              </div>
            </div>

            <ul className="space-y-1.5">
              {data.gates.map((gate) => (
                <li key={gate.id} className="flex items-start gap-2 text-sm">
                  {gate.met ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="text-foreground">{gate.label}</span>
                    <span className="ml-1 text-xs text-muted-foreground tabular-nums">
                      {formatGateActual(gate.actual, gate.unit)}
                      {gate.unit !== 'count' ? ` / ${gate.required}${gate.unit === 'percent' ? '%' : ''}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {data.amountsConfigured
            ? null
            : 'Country payout bands are not configured yet. Activity gates still update live. '}
          {data.isPartialMonth
            ? `Month-to-date on ${data.workingDaysWorked} day${data.workingDaysWorked === 1 ? '' : 's'} worked. Remaining working days can still change this amount.`
            : 'Month complete. Estimate only — not a payslip.'}
        </p>
      </CardContent>
    </Card>
  );
}
