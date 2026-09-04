'use client';

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
} from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { cn } from '@/lib/utils';

type ReportsCallQualityRateRadialProps = {
  rate: number | null;
  label: string;
  passedLabel?: string;
  failedLabel?: string;
  className?: string;
};

/**
 * Pass-rate radial: green = passed share, red = remainder. Null rate shows an em dash.
 */
export function ReportsCallQualityRateRadial({
  rate,
  label,
  passedLabel = 'Passed',
  failedLabel = 'Missed',
  className,
}: ReportsCallQualityRateRadialProps) {
  const clamped = rate == null || !Number.isFinite(rate) ? null : Math.min(100, Math.max(0, rate));
  const passed = clamped ?? 0;
  const failed = Math.max(0, 100 - passed);
  const chartData = [{ name: 'rate', passed, failed }];
  const config = {
    passed: { label: passedLabel, color: REPORTS_CHART_GREEN },
    failed: { label: failedLabel, color: REPORTS_CHART_RED },
  } satisfies ChartConfig;

  const fillClass =
    clamped == null ? 'fill-muted-foreground' : clamped >= 50 ? 'fill-green-600' : 'fill-red-600';
  const textClass =
    clamped == null ? 'text-muted-foreground' : clamped >= 50 ? 'text-green-700' : 'text-red-700';

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-[112px]">
        <RadialBarChart
          data={chartData}
          startAngle={180}
          endAngle={0}
          innerRadius={36}
          outerRadius={52}
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
                        y={(viewBox.cy || 0) - 4}
                        className={cn('text-lg font-bold', fillClass)}
                      >
                        {clamped == null ? '—' : `${Math.round(clamped)}%`}
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </PolarRadiusAxis>
          <RadialBar
            dataKey="passed"
            stackId="a"
            cornerRadius={4}
            fill="var(--color-passed)"
            className="stroke-transparent stroke-2"
          />
          {failed > 0 ? (
            <RadialBar
              dataKey="failed"
              stackId="a"
              cornerRadius={4}
              fill="var(--color-failed)"
              className="stroke-transparent stroke-2"
            />
          ) : null}
        </RadialBarChart>
      </ChartContainer>
      <p className={cn('text-center text-[10px] font-medium uppercase tracking-wide', textClass)}>
        {label}
      </p>
    </div>
  );
}
