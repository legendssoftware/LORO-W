'use client';

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface PolicyRadialSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface ReportsPolicySegmentRadialProps {
  segments: readonly PolicyRadialSegment[];
  /** Large text in the centre of the arc, for example "86%". */
  centerLabel: string;
  /** Small text under the centre label. */
  centerSub: string;
  className?: string;
}

/**
 * Stacked semicircle (shadcn radial chart): each segment is a share of the arc, left to right.
 * Used for "verified vs remaining" and for the meets / below / not-measurable split.
 */
export function ReportsPolicySegmentRadial({
  segments,
  centerLabel,
  centerSub,
  className,
}: ReportsPolicySegmentRadialProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  if (total <= 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data</p>;
  }

  const chartData = [
    Object.fromEntries(segments.map((segment) => [segment.key, Math.max(0, segment.value)])),
  ];
  const config: ChartConfig = Object.fromEntries(
    segments.map((segment) => [segment.key, { label: segment.label, color: segment.color }]),
  );

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-[220px]">
        <RadialBarChart
          data={chartData}
          startAngle={180}
          endAngle={0}
          innerRadius={70}
          outerRadius={105}
        >
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 14} className="fill-foreground text-2xl font-bold">
                        {centerLabel}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 4} className="fill-muted-foreground text-xs">
                        {centerSub}
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </PolarRadiusAxis>
          {segments.map((segment) => (
            <RadialBar
              key={segment.key}
              dataKey={segment.key}
              stackId="a"
              cornerRadius={5}
              fill={`var(--color-${segment.key})`}
              className="stroke-transparent stroke-2"
            />
          ))}
        </RadialBarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5 text-xs text-foreground">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: segment.color }}
              aria-hidden
            />
            <span>
              {segment.label} <span className="tabular-nums text-muted-foreground">({segment.value.toLocaleString()})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
