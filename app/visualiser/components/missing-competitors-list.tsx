'use client';

import Link from 'next/link';
import { ExternalLink, MapPinOff } from 'lucide-react';
import type { CompetitorMissingGeocodeItem } from '@/api/endpoints/competitors';
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
 * Clickable list of competitors missing address and/or coordinates.
 * Links open `/competitors?edit={id}` to launch the edit form.
 */
export function MissingCompetitorsList({
  items,
  maxVisible = 12,
  className,
  compact = false,
}: MissingCompetitorsListProps) {
  if (items.length === 0) return null;

  const visible = items.slice(0, maxVisible);
  const remaining = items.length - visible.length;

  return (
    <div className={cn('space-y-1.5', className)}>
      <p
        className={cn(
          'flex items-center gap-1 font-medium',
          compact ? 'text-[10px]' : 'text-xs',
        )}
      >
        <MapPinOff className={compact ? 'size-3' : 'size-3.5'} />
        Missing address / coordinates ({items.length})
      </p>
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
        <p className="text-muted-foreground text-[10px]">
          +{remaining} more — open Competitors to edit
        </p>
      ) : null}
    </div>
  );
}
