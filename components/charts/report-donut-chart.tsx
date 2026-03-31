'use client';

import { Cell, Label, Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

/** Pie legends list only this many entries so the row does not overflow the card. */
export const REPORT_PIE_LEGEND_MAX_ITEMS = 3;

/** Nudge the center summary downward so it sits optically centered in the inner ring (SVG y grows down). */
const CENTER_LABEL_VERTICAL_OFFSET = 8;

/** One slice after resolving labels and palette (shared reports / attendance). */
export type ReportDonutSlice = {
  id: string;
  label: string;
  value: number;
  fill: string;
};

export interface ReportDonutChartProps {
  config: ChartConfig;
  data: ReportDonutSlice[];
  /** Main center line (e.g. total count). */
  centerPrimary: string;
  /** Subtitle under the primary (e.g. "Leads" / "Check-ins"). */
  centerSecondary: string;
  className?: string;
  /** Extra classes for tooltip shell (wider cards for long slice labels). */
  tooltipClassName?: string;
  /** Field on each pie row used to look up `ChartConfig` (must match slice `id`, mapped as `name`; default `name`). */
  legendNameKey?: string;
}

/**
 * Donut chart aligned with attendance "Late vs on time": thin ring (percent radii),
 * rounded segment corners, optional center summary, bottom legend.
 */
export function ReportDonutChart({
  config,
  data,
  centerPrimary,
  centerSecondary,
  className,
  tooltipClassName,
  legendNameKey = 'name',
}: ReportDonutChartProps) {
  const pieRows = data.map((d) => ({
    name: d.id,
    label: d.label,
    value: d.value,
    fill: d.fill,
  }));

  return (
    <ChartContainer
      config={config}
      className={cn(
        'mx-auto aspect-square w-full max-h-[224px]',
        className
      )}
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              nameKey={legendNameKey}
              className={tooltipClassName ?? 'min-w-[12rem]'}
            />
          }
        />
        <Pie
          data={pieRows}
          dataKey="value"
          nameKey="name"
          innerRadius="70%"
          outerRadius="85%"
          strokeWidth={2}
          paddingAngle={2}
          cornerRadius={6}
        >
          {pieRows.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                const cy = viewBox.cy ?? 0;
                return (
                  <text x={viewBox.cx} y={cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={cy - 16 + CENTER_LABEL_VERTICAL_OFFSET}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {centerPrimary}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={cy + 4 + CENTER_LABEL_VERTICAL_OFFSET}
                      className="fill-muted-foreground text-sm"
                    >
                      {centerSecondary}
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
        <ChartLegend
          content={
            <ChartLegendContent
              nameKey={legendNameKey}
              maxItems={REPORT_PIE_LEGEND_MAX_ITEMS}
            />
          }
          verticalAlign="bottom"
          className="flex-wrap justify-center gap-2 pt-2"
        />
      </PieChart>
    </ChartContainer>
  );
}
