'use client';

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { getScoreColorClasses, callQualityScoreBand, callQualityScoreBandLabel } from '../lib/score-colors';
import { cn } from '@/lib/utils';
import { formatCallScore } from '../call-display';

const remainderColor = 'hsl(var(--muted))';

function scoreChartColor(value: number): string {
  const clamped = Math.min(100, Math.max(0, value));
  const band = callQualityScoreBand(clamped);
  switch (band) {
    case 'excellent':
      return 'hsl(142 71% 45%)';
    case 'good':
      return 'hsl(160 64% 40%)';
    case 'needsImprovement':
      return 'hsl(38 92% 50%)';
    case 'poor':
      return 'hsl(0 84% 60%)';
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

type CallScoreRadialChartProps = {
  score: number;
  className?: string;
  /** Smaller chart for report cards and review rows. */
  compact?: boolean;
  /** Hide the caption below the chart (e.g. when embedded in a tight row). */
  hideCaption?: boolean;
};

/**
 * Overall call quality 0–100 as a shadcn radial bar (score vs remainder).
 */
export function CallScoreRadialChart({
  score,
  className,
  compact = false,
  hideCaption = false,
}: CallScoreRadialChartProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0));
  const remainder = Math.max(0, 100 - clamped);
  const chartData = [{ name: 'quality', score: clamped, remainder }];
  const progressColors = getScoreColorClasses(clamped);
  const chartConfig = {
    score: {
      label: 'Score',
      color: scoreChartColor(clamped),
    },
    remainder: {
      label: 'Remaining',
      color: remainderColor,
    },
  } satisfies ChartConfig;

  const innerRadius = compact ? 36 : 64;
  const outerRadius = compact ? 52 : 100;
  const maxWidth = compact ? 'max-w-[112px]' : 'max-w-[220px]';
  const scoreClass = compact ? 'text-lg font-bold' : 'text-2xl font-bold';
  const labelClass = compact ? 'fill-muted-foreground text-[10px]' : 'fill-muted-foreground text-sm';
  const scoreYOffset = compact ? -6 : -12;
  const labelYOffset = compact ? 10 : 8;

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <ChartContainer
        config={chartConfig}
        className={cn('mx-auto aspect-square w-full', maxWidth)}
      >
        <RadialBarChart
          data={chartData}
          startAngle={180}
          endAngle={0}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
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
                        y={(viewBox.cy || 0) + scoreYOffset}
                        className={cn(scoreClass, progressColors.fill)}
                      >
                        {formatCallScore(clamped)}
                      </tspan>
                      {!compact ? (
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + labelYOffset}
                          className={labelClass}
                        >
                          Overall
                        </tspan>
                      ) : null}
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
            cornerRadius={4}
            fill="var(--color-score)"
            className="stroke-transparent stroke-2"
          />
          {remainder > 0 ? (
            <RadialBar
              dataKey="remainder"
              stackId="a"
              cornerRadius={4}
              fill="var(--color-remainder)"
              className="stroke-transparent stroke-2"
            />
          ) : null}
        </RadialBarChart>
      </ChartContainer>
      {!hideCaption && !compact ? (
        <p className={cn('text-center text-xs tabular-nums', progressColors.text)}>
          {callQualityScoreBandLabel(callQualityScoreBand(clamped))} · {formatCallScore(clamped)} / 100
        </p>
      ) : null}
    </div>
  );
}
