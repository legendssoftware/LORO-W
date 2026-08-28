'use client';

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ATT_CHART_HSL } from '@/lib/chart-colors';
import { getProgressColorClasses } from '@/app/staff/components/report-progress-bar';
import { cn } from '@/lib/utils';
import { formatCallScore } from '../call-display';

const chartConfig = {
  score: {
    label: 'Score',
    color: ATT_CHART_HSL.c1,
  },
  remainder: {
    label: 'Remaining',
    color: 'hsl(var(--muted))',
  },
} satisfies ChartConfig;

type CallScoreRadialChartProps = {
  score: number;
  className?: string;
};

/**
 * Overall call quality 0–100 as a shadcn radial bar (score vs remainder).
 */
export function CallScoreRadialChart({ score, className }: CallScoreRadialChartProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0));
  const remainder = Math.max(0, 100 - clamped);
  const chartData = [{ name: 'quality', score: clamped, remainder }];
  const progressFill = clamped >= 70 ? 'fill-green-600' : 'fill-red-600';
  const progressText = getProgressColorClasses(clamped).text;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[220px]">
        <RadialBarChart data={chartData} startAngle={180} endAngle={0} innerRadius={64} outerRadius={100}>
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
                        className={cn('text-2xl font-bold', progressFill)}
                      >
                        {formatCallScore(clamped)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 8}
                        className="fill-muted-foreground text-sm"
                      >
                        Overall
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </PolarRadiusAxis>
          <RadialBar
            dataKey="score"
            stackId="a"
            cornerRadius={5}
            fill="var(--color-score)"
            className="stroke-transparent stroke-2"
          />
          {remainder > 0 ? (
            <RadialBar
              dataKey="remainder"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-remainder)"
              className="stroke-transparent stroke-2"
            />
          ) : null}
        </RadialBarChart>
      </ChartContainer>
      <p className={cn('text-center text-xs tabular-nums text-muted-foreground', progressText)}>
        {formatCallScore(clamped)} / 100
      </p>
    </div>
  );
}
