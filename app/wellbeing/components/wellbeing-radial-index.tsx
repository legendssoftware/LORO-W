'use client';

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { REPORTS_CHART_GREEN } from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { cn } from '@/lib/utils';

interface WellbeingRadialIndexProps {
  label: string;
  value: number;
  unit?: string;
  className?: string;
}

export function WellbeingRadialIndex({
  label,
  value,
  unit = '%',
  className,
}: WellbeingRadialIndexProps) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const chartData = [{ name: label, value: safe, remaining: Math.max(0, 100 - safe) }];
  const config: ChartConfig = {
    value: { label, color: REPORTS_CHART_GREEN },
    remaining: { label: 'Remaining', color: 'hsl(var(--muted))' },
  };

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-[180px]">
        <RadialBarChart data={chartData} startAngle={180} endAngle={0} innerRadius={52} outerRadius={80}>
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 8} className="fill-foreground text-xl font-bold">
                        {safe}
                        {unit}
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </PolarRadiusAxis>
          <RadialBar dataKey="value" stackId="a" cornerRadius={5} fill="var(--color-value)" className="stroke-transparent stroke-2" />
          <RadialBar dataKey="remaining" stackId="a" cornerRadius={5} fill="var(--color-remaining)" className="stroke-transparent stroke-2" />
        </RadialBarChart>
      </ChartContainer>
      <p className="text-center text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
