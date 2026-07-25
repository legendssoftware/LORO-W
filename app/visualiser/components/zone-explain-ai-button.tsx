'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
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

type ZoneExplainAiButtonProps = {
  payload: ExplainZonePayload;
  className?: string;
};

/**
 * Opens a dialog with a Gemini (or fallback) explanation of a catchment / opportunity.
 */
export function ZoneExplainAiButton({
  payload,
  className,
}: ZoneExplainAiButtonProps) {
  const client = useApiClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (explanation) return;
    setLoading(true);
    try {
      const result = await explainMapZone(client, payload);
      setExplanation(result.explanation);
      setSource(result.source);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not generate explanation';
      toast.error(message);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className ?? 'h-7 w-full text-xs'}
        onClick={() => void handleOpen()}
      >
        <Sparkles className="size-3.5" />
        Explain with AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-amber-600" />
              AI briefing — {payload.title}
            </DialogTitle>
            <DialogDescription>
              {source === 'fallback'
                ? 'Generated from zone numbers (AI unavailable). Simulation only — not a forecast.'
                : source === 'ai'
                  ? 'Gemini summary of this simulation zone. Simulation only — not a forecast.'
                  : 'Loading explanation…'}
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Analysing zone…
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {explanation}
              </p>
              <p className="border-border bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-xs leading-relaxed">
                This is a simulation only — modelled estimates, not a guarantee
                of revenue or site performance. Do not rely on it alone for
                investment or lease decisions. Confirm the site in person
                (footfall, access, neighbours, competition, demographics) and
                do your own due diligence. LORO is not liable for losses from
                acting solely on this briefing.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
