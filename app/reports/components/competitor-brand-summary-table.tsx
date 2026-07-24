'use client';

import type { BrandCount, CategoryCount } from '@/api/types/site-opportunity';
import {
  CATEGORY_LABELS,
  resolveCompetitorCategory,
} from '@/lib/site-opportunity/compute/competitor-category';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';
import { cn } from '@/lib/utils';

export function CompetitorBrandSummaryTable({
  byBrand,
  byCategory,
  compact = false,
  className,
}: {
  byBrand: BrandCount[];
  byCategory?: CategoryCount[];
  compact?: boolean;
  className?: string;
}) {
  if (byBrand.length === 0) {
    return (
      <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
        No hardware in radius
      </p>
    );
  }

  const categoryRows = byCategory ?? [];

  return (
    <div className={cn('space-y-2 min-w-0', className)}>
      {categoryRows.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {categoryRows.map((row) => (
            <span
              key={row.category}
              className={cn(
                'rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground',
                compact ? 'text-[10px]' : 'text-xs',
              )}
            >
              {CATEGORY_LABELS[row.category]} ×{row.count}
            </span>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className={cn('w-full text-left', compact ? 'text-[10px]' : 'text-xs')}>
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="pb-1 pr-2 font-medium">Brand</th>
              <th className="pb-1 pr-2 font-medium text-right">Qty</th>
              <th className="pb-1 font-medium text-right">Turnover/mo</th>
            </tr>
          </thead>
          <tbody>
            {byBrand.map((row) => (
              <tr key={row.brand} className="border-b border-border/40 last:border-0">
                <td className="py-1 pr-2">
                  <span className="font-medium">{row.brand}</span>
                  <span className="ml-1 text-muted-foreground">
                    ({CATEGORY_LABELS[resolveCompetitorCategory(row.brand)]})
                  </span>
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">{row.count}</td>
                <td className="py-1 text-right tabular-nums font-medium">
                  {formatZarShort(row.turnoverZAR)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
