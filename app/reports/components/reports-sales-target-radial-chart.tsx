'use client';

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatReportMoney } from '@/app/reports/lib/reports-chart-format';
import { reportsTooltipRow } from '@/app/reports/lib/reports-chart-tooltip';
import {
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
} from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { cn } from '@/lib/utils';

interface ReportsSalesTargetRadialChartProps {
  target: number;
  achieved: number;
  className?: string;
}

/**
 * Stacked radial (semicircle) for team sales target vs achieved —
 * shadcn ChartRadialStacked pattern (green = achieved, red = remaining).
 */
export function ReportsSalesTargetRadialChart({
  target,
  achieved,
  className,
}: ReportsSalesTargetRadialChartProps) {
  const safeTarget = Math.max(0, Math.round(target));
  const safeAchieved = Math.max(0, Math.round(achieved));
  const remaining = Math.max(0, safeTarget - safeAchieved);
  const progress =
    safeTarget > 0
      ? Math.round(Math.min(999, Math.max(0, (safeAchieved / safeTarget) * 100)))
      : safeAchieved > 0
        ? 100
        : 0;

  if (safeTarget <= 0 && safeAchieved <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
    );
  }

  const chartData = [
    {
      name: 'sales',
      achieved: safeAchieved,
      remaining,
    },
  ];

  const config: ChartConfig = {
    achieved: {
      label: 'Achieved',
      color: REPORTS_CHART_GREEN,
    },
    remaining: {
      label: 'Remaining to target',
      color: REPORTS_CHART_RED,
    },
  };

  const legendItems = [
    { key: 'achieved', label: 'Achieved', color: REPORTS_CHART_GREEN },
    {
      key: 'remaining',
      label: 'Remaining to target',
      color: REPORTS_CHART_RED,
    },
  ] as const;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square w-full max-w-[260px]"
      >
        <RadialBarChart
          data={chartData}
          endAngle={180}
          innerRadius={80}
          outerRadius={120}
        >
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name, item) =>
                  reportsTooltipRow(value, name, item, {
                    formatValue: (n) => formatReportMoney(n) || 'R0',
                    label:
                      name === 'achieved'
                        ? 'Achieved'
                        : name === 'remaining'
                          ? 'Remaining to target'
                          : undefined,
                  })
                }
              />
            }
          />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 16}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {progress}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 4}
                        className="fill-muted-foreground text-sm"
                      >
                        Of target
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </PolarRadiusAxis>
          <RadialBar
            dataKey="achieved"
            stackId="a"
            cornerRadius={5}
            fill="var(--color-achieved)"
            className="stroke-transparent stroke-2"
          />
          <RadialBar
            dataKey="remaining"
            stackId="a"
            cornerRadius={5}
            fill="var(--color-remaining)"
            className="stroke-transparent stroke-2"
          />
        </RadialBarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
        {legendItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-1.5 text-sm text-foreground"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground tabular-nums">
        {formatReportMoney(safeAchieved) || 'R0'}
        <span className="mx-1">/</span>
        {formatReportMoney(safeTarget) || 'R0'}
      </p>
    </div>
  );
}
