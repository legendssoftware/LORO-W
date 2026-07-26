'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { CaptureTimelinePoint } from '@/api/types/site-opportunity';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';

const chartConfig = {
  mid: { label: 'Expected', color: 'hsl(173 80% 30%)' },
  low: { label: 'Low', color: 'hsl(215 16% 55%)' },
  high: { label: 'High', color: 'hsl(38 92% 45%)' },
} satisfies ChartConfig;

interface SimulationTrendChartProps {
  timeline: CaptureTimelinePoint[];
}

/**
 * Monthly (3-month step) projected turnover trend for the selected zone.
 */
export function SimulationTrendChart({ timeline }: SimulationTrendChartProps) {
  const data = useMemo(
    () =>
      timeline.map((p) => ({
        month: p.month,
        label: `M${p.month}`,
        low: p.revenueLowZAR,
        mid: p.revenueMidZAR,
        high: p.revenueHighZAR,
      })),
    [timeline],
  );

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No ramp data for this zone.</p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-[4/3] w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={44}
          fontSize={10}
          tickFormatter={(v: number) => formatZarShort(v).replace('R ', '')}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                typeof value === 'number' ? formatZarShort(value) : String(value)
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="low"
          stroke="var(--color-low)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="mid"
          stroke="var(--color-mid)"
          strokeWidth={2}
          dot={{ r: 2.5 }}
        />
        <Line
          type="monotone"
          dataKey="high"
          stroke="var(--color-high)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
