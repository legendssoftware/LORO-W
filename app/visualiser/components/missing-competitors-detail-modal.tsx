'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MapPinOff, Search } from 'lucide-react';
import type { CompetitorMissingGeocodeItem } from '@/api/endpoints/competitors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type MissingCompetitorsDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CompetitorMissingGeocodeItem[];
};

/**
 * Full-detail dialog for competitors missing address and/or map coordinates.
 */
export function MissingCompetitorsDetailModal({
  open,
  onOpenChange,
  items,
}: MissingCompetitorsDetailModalProps) {
  const [query, setQuery] = useState('');

  const missingCoordsCount = useMemo(
    () => items.filter((i) => i.missingCoords).length,
    [items],
  );
  const missingAddressCount = useMemo(
    () => items.filter((i) => i.missingAddress).length,
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = `${item.name} ${item.addressLine ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <MapPinOff className="text-amber-700 size-4 dark:text-amber-300" />
            Missing address / coordinates
          </DialogTitle>
          <DialogDescription>
            {items.length} competitor{items.length === 1 ? '' : 's'} need
            address or coordinate fixes before they appear on the map.
          </DialogDescription>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary" className="font-normal">
              {items.length} total
            </Badge>
            <Badge variant="outline" className="font-normal">
              {missingCoordsCount} no coords
            </Badge>
            <Badge variant="outline" className="font-normal">
              {missingAddressCount} no address
            </Badge>
          </div>
        </DialogHeader>

        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or address…"
              className="h-9 pl-8"
              aria-label="Search missing competitors"
            />
          </div>
        </div>

        <ScrollArea className="h-[min(420px,50vh)]">
          <ul className="space-y-2 px-5 py-3">
            {filtered.length === 0 ? (
              <li className="text-muted-foreground py-8 text-center text-sm">
                No competitors match “{query.trim()}”.
              </li>
            ) : (
              filtered.map((item) => (
                <li
                  key={item.id}
                  className="border-border/70 bg-card rounded-md border px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm leading-snug font-medium">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.missingCoords ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-50 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                          >
                            No coordinates
                          </Badge>
                        ) : null}
                        {item.missingAddress ? (
                          <Badge
                            variant="outline"
                            className="border-rose-500/40 bg-rose-50 text-[10px] text-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
                          >
                            No address
                          </Badge>
                        ) : null}
                      </div>
                      {item.addressLine ? (
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {item.addressLine}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-xs italic">
                          No address on file
                        </p>
                      )}
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Link href={`/competitors?edit=${item.id}`}>
                        Edit
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>

        <div
          className={cn(
            'text-muted-foreground flex items-center justify-between gap-2 border-t px-5 py-3 text-xs',
          )}
        >
          <span>
            Showing {filtered.length} of {items.length}
          </span>
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href="/competitors">Open Competitors</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
