'use client';

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatReportCompact } from '@/app/reports/lib/reports-chart-format';
import { reportsTooltipRow } from '@/app/reports/lib/reports-chart-tooltip';
import {
  REPORTS_CHART_AMBER,
  REPORTS_CHART_GREEN,
} from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { getProgressColorClasses } from '@/app/staff/components/report-progress-bar';
import { cn } from '@/lib/utils';

interface ReportsConversionRateRadialChartProps {
  leads: number;
  visits: number;
  calls: number;
  className?: string;
}

/**
 * Lead conversion vs visits + calls — green = converted (leads), amber = remaining activity.
 * Rate = leads / (visits + calls).
 */
export function ReportsConversionRateRadialChart({
  leads,
  visits,
  calls,
  className,
}: ReportsConversionRateRadialChartProps) {
  const safeLeads = Math.max(0, Math.round(leads));
  const safeVisits = Math.max(0, Math.round(visits));
  const safeCalls = Math.max(0, Math.round(calls));
  const activity = safeVisits + safeCalls;
  const converted = Math.min(safeLeads, activity > 0 ? activity : safeLeads);
  const remaining = Math.max(0, activity - converted);
  const rate =
    activity > 0
      ? Math.round(Math.min(100, Math.max(0, (safeLeads / activity) * 100)))
      : safeLeads > 0
        ? 100
        : 0;

  if (activity <= 0 && safeLeads <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
    );
  }

  const chartData = [
    {
      name: 'conversion',
      converted: activity > 0 ? converted : safeLeads,
      remaining: activity > 0 ? remaining : 0,
    },
  ];

  const config: ChartConfig = {
    converted: {
      label: 'Leads',
      color: REPORTS_CHART_GREEN,
    },
    remaining: {
      label: 'Visits + calls',
      color: REPORTS_CHART_AMBER,
    },
  };

  const legendItems = [
    { key: 'converted', label: 'Leads', color: REPORTS_CHART_GREEN },
    {
      key: 'remaining',
      label: 'Visits + calls (no lead)',
      color: REPORTS_CHART_AMBER,
    },
  ] as const;

  const progressFill = rate >= 70 ? 'fill-green-600' : 'fill-red-600';
  const progressText = getProgressColorClasses(rate).text;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square w-full max-w-[260px]"
      >
        <RadialBarChart
          data={chartData}
          startAngle={180}
          endAngle={0}
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
                    formatValue: (n) => formatReportCompact(n) || '0',
                    label:
                      name === 'converted'
                        ? 'Leads'
                        : name === 'remaining'
                          ? 'Visits + calls without lead'
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
                        className={cn('text-2xl font-bold', progressFill)}
                      >
                        {rate}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 4}
                        className="fill-muted-foreground text-sm"
                      >
                        Conversion
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </PolarRadiusAxis>
          <RadialBar
            dataKey="converted"
            stackId="a"
            cornerRadius={5}
            fill="var(--color-converted)"
            className="stroke-transparent stroke-2"
          />
          {activity > 0 ? (
            <RadialBar
              dataKey="remaining"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-remaining)"
              className="stroke-transparent stroke-2"
            />
          ) : null}
        </RadialBarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
        {legendItems.slice(0, activity > 0 ? 2 : 1).map((item) => (
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
        <span className={progressText}>
          {formatReportCompact(safeLeads) || '0'} leads
        </span>
        <span className="mx-1">/</span>
        {formatReportCompact(activity) || '0'} visits+calls
      </p>
    </div>
  );
}
