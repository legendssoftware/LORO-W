'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { HardwareBrandKey } from '@/api/types/site-opportunity';
import { brandChartColor } from '@/lib/site-opportunity/compute/brands';
import {
  CATEGORY_LABELS,
  resolveCompetitorCategory,
  type CompetitorCategoryKey,
} from '@/lib/site-opportunity/compute/competitor-category';
import type { ZoneCompetitorStore } from '@/lib/site-opportunity/zone-competitors';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<CompetitorCategoryKey, string> = {
  retailer: 'hsl(173 80% 30%)',
  sd: 'hsl(38 92% 45%)',
};

export type CompetitorsByBrand = Map<
  HardwareBrandKey,
  ZoneCompetitorStore[]
>;

type CompetitorsBreakdownChartProps = {
  competitorsByBrand: CompetitorsByBrand;
  /** Compact for the side panel; fuller height in the detail modal. */
  compact?: boolean;
  className?: string;
};

/**
 * Bar chart of competitor counts by brand, with category totals underneath.
 */
export function CompetitorsBreakdownChart({
  competitorsByBrand,
  compact = false,
  className,
}: CompetitorsBreakdownChartProps) {
  const brandRows = useMemo(() => {
    return [...competitorsByBrand.entries()]
      .map(([brand, stores]) => ({
        brand,
        count: stores.length,
        fill: brandChartColor(brand),
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
  }, [competitorsByBrand]);

  const categoryRows = useMemo(() => {
    const totals = new Map<CompetitorCategoryKey, number>();
    for (const row of brandRows) {
      const cat = resolveCompetitorCategory(row.brand);
      totals.set(cat, (totals.get(cat) ?? 0) + row.count);
    }
    return (['retailer', 'sd'] as const)
      .map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        count: totals.get(category) ?? 0,
        fill: CATEGORY_COLORS[category],
      }))
      .filter((r) => r.count > 0);
  }, [brandRows]);

  const total = brandRows.reduce((sum, r) => sum + r.count, 0);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      count: { label: 'Stores' },
    };
    for (const row of brandRows) {
      config[row.brand] = { label: row.brand, color: row.fill };
    }
    return config;
  }, [brandRows]);

  if (brandRows.length === 0) {
    return (
      <p className="text-muted-foreground text-[11px]">
        No geocoded competitors in this bubble.
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <ChartContainer
        config={chartConfig}
        className={cn(
          'w-full',
          compact ? 'aspect-[16/9] max-h-[140px]' : 'aspect-[2/1] max-h-[220px]',
        )}
      >
        <BarChart
          data={brandRows}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
        >
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="brand"
            width={compact ? 72 : 88}
            tickLine={false}
            axisLine={false}
            fontSize={10}
            tickMargin={4}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value) =>
                  typeof value === 'number'
                    ? `${value} store${value === 1 ? '' : 's'}`
                    : String(value)
                }
              />
            }
          />
          <Bar dataKey="count" radius={4} name="Stores">
            {brandRows.map((row) => (
              <Cell key={row.brand} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="text-muted-foreground font-medium">
          {total} total
        </span>
        {categoryRows.map((row) => (
          <span key={row.category} className="flex items-center gap-1">
            <span
              className="inline-block size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: row.fill }}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {row.label} ({row.count})
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
