'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MapPinOff } from 'lucide-react';
import type { CompetitorMissingGeocodeItem } from '@/api/endpoints/competitors';
import { MissingCompetitorsDetailModal } from '@/app/visualiser/components/missing-competitors-detail-modal';
import { cn } from '@/lib/utils';

type MissingCompetitorsListProps = {
  items: CompetitorMissingGeocodeItem[];
  /** Max rows before “and N more”. */
  maxVisible?: number;
  className?: string;
  /** Compact styling for the simulation side panel. */
  compact?: boolean;
};

/**
 * Preview list of competitors missing address and/or coordinates.
 * Header / “+N more” open a detail dialog; row links still jump to edit.
 */
export function MissingCompetitorsList({
  items,
  maxVisible = 12,
  className,
  compact = false,
}: MissingCompetitorsListProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (items.length === 0) return null;

  const visible = items.slice(0, maxVisible);
  const remaining = items.length - visible.length;

  return (
    <div className={cn('space-y-1.5', className)}>
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className={cn(
          'hover:text-foreground flex w-full items-center gap-1 text-left font-medium transition-colors',
          compact ? 'text-[10px]' : 'text-xs',
        )}
        aria-haspopup="dialog"
        aria-expanded={detailOpen}
      >
        <MapPinOff className={compact ? 'size-3' : 'size-3.5'} />
        <span className="underline-offset-2 hover:underline">
          Missing address / coordinates ({items.length})
        </span>
        <span className="text-muted-foreground ml-auto font-normal">
          View all
        </span>
      </button>
      <ul
        className={cn(
          'space-y-1 overflow-y-auto',
          compact ? 'max-h-28' : 'max-h-48',
        )}
      >
        {visible.map((item) => {
          const reasons: string[] = [];
          if (item.missingCoords) reasons.push('no coords');
          if (item.missingAddress) reasons.push('no address');
          return (
            <li key={item.id}>
              <Link
                href={`/competitors?edit=${item.id}`}
                className={cn(
                  'text-foreground hover:text-primary flex items-start justify-between gap-2 rounded border border-transparent px-1.5 py-1 transition-colors hover:border-border hover:bg-muted/40',
                  compact ? 'text-[11px]' : 'text-sm',
                )}
                title="Edit competitor address"
              >
                <span className="min-w-0">
                  <span className="font-medium leading-snug">{item.name}</span>
                  <span className="text-muted-foreground mt-0.5 block text-[10px]">
                    {reasons.join(' · ')}
                    {item.addressLine ? ` · ${item.addressLine}` : ''}
                  </span>
                </span>
                <ExternalLink className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
      {remaining > 0 ? (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="text-muted-foreground hover:text-foreground text-left text-[10px] underline-offset-2 hover:underline"
        >
          +{remaining} more — view all in detail
        </button>
      ) : null}

      <MissingCompetitorsDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        items={items}
      />
    </div>
  );
}
