'use client';

import { useState } from 'react';
import { Expand, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  explainMapZone,
  type ExplainZonePayload,
} from '@/api/endpoints/map-explain-zone';
import {
  CompetitorsBreakdownChart,
  type CompetitorsByBrand,
} from '@/app/visualiser/components/competitors-breakdown-chart';
import {
  CATEGORY_LABELS,
  resolveCompetitorCategory,
} from '@/lib/site-opportunity/compute/competitor-category';
import type { ZoneCompetitorStore } from '@/lib/site-opportunity/zone-competitors';
import { cn } from '@/lib/utils';

type CompetitorsDetailModalProps = {
  title: string;
  competitorsByBrand: CompetitorsByBrand;
  explainPayload: ExplainZonePayload;
  className?: string;
};

function CompetitorStoreList({
  competitorsByBrand,
}: {
  competitorsByBrand: CompetitorsByBrand;
}) {
  const entries = [...competitorsByBrand.entries()].sort((a, b) => {
    const countDiff = b[1].length - a[1].length;
    if (countDiff !== 0) return countDiff;
    return a[0].localeCompare(b[0]);
  });

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No geocoded competitors in this bubble.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([brand, stores]) => {
        const category = resolveCompetitorCategory(brand);
        return (
          <div key={brand}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">
                {brand}{' '}
                <span className="text-muted-foreground font-normal">
                  ({stores.length})
                </span>
              </p>
              <span className="text-muted-foreground text-[11px]">
                {CATEGORY_LABELS[category]}
              </span>
            </div>
            <ul className="space-y-2">
              {stores.map((store: ZoneCompetitorStore) => (
                <li
                  key={String(store.id)}
                  className="border-border/60 rounded-md border px-3 py-2 text-sm"
                >
                  <p className="font-medium leading-snug">{store.name}</p>
                  {store.address ? (
                    <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                      {store.address}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mt-0.5 text-xs italic">
                      No address on record
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Opens a detail dialog with competitor breakdown chart, full store list,
 * and an AI briefing (same pattern as zone explain).
 */
export function CompetitorsDetailModalButton({
  title,
  competitorsByBrand,
  explainPayload,
  className,
}: CompetitorsDetailModalProps) {
  const client = useApiClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);

  const total = [...competitorsByBrand.values()].reduce(
    (sum, stores) => sum + stores.length,
    0,
  );

  async function ensureExplanation() {
    if (explanation) return;
    setLoading(true);
    try {
      const result = await explainMapZone(client, explainPayload);
      setExplanation(result.explanation);
      setSource(result.source);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not generate explanation';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    void ensureExplanation();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('h-7 text-xs', className)}
        onClick={handleOpen}
        disabled={total === 0}
      >
        <Expand className="size-3.5" />
        View in detail
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base">
              Competitors in radius — {title}
            </DialogTitle>
            <DialogDescription>
              {total} competitor{total === 1 ? '' : 's'} grouped by brand, with
              an AI briefing of the competitive set.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide uppercase">
                Breakdown by brand
              </h3>
              <CompetitorsBreakdownChart
                competitorsByBrand={competitorsByBrand}
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide uppercase">
                Store list
              </h3>
              <CompetitorStoreList competitorsByBrand={competitorsByBrand} />
            </section>

            <section className="space-y-2 border-t pt-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="size-3.5 text-amber-600" />
                AI briefing
              </h3>
              {loading ? (
                <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Analysing competitors…
                </div>
              ) : explanation ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-[11px]">
                    {source === 'fallback'
                      ? 'Generated from zone numbers (AI unavailable). Simulation only — not a forecast.'
                      : 'Gemini summary of this simulation zone. Simulation only — not a forecast.'}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {explanation}
                  </p>
                  <p className="border-border bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-xs leading-relaxed">
                    This is a simulation only — modelled estimates, not a
                    guarantee of revenue or site performance. Do not rely on it
                    alone for investment or lease decisions. Confirm the site in
                    person and do your own due diligence.
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void ensureExplanation()}
                >
                  <Sparkles className="size-3.5" />
                  Generate AI briefing
                </Button>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
