'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_SITE_OPPORTUNITY_SETTINGS } from '@/api/types/site-opportunity';
import { MARKET_CAPTURE_PHASES } from '@/lib/site-opportunity/compute/capture-phases';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';

interface MapSimulationInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Short explanation of the catchment maths, using the live default settings.
 */
export function MapSimulationInfoModal({
  open,
  onOpenChange,
}: MapSimulationInfoModalProps) {
  const defaults = DEFAULT_SITE_OPPORTUNITY_SETTINGS;
  const radiusKm = defaults.radiusMeters / 1000;
  const captureLow = Math.round(defaults.captureLowPct * 100);
  const captureHigh = Math.round(defaults.captureHighPct * 100);
  const revenuePerSqm = defaults.revenuePerSqmMonthlyZAR ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>How simulation works</DialogTitle>
          <DialogDescription>
            A ranking model. Change the numbers in Simulate. These are the
            defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-sm leading-relaxed">
          <section className="space-y-1">
            <h3 className="font-semibold">Pool</h3>
            <p className="text-muted-foreground">
              Add the monthly brand turnover of every competitor store inside
              the radius. Default radius is {radiusKm} km.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold">Potential</h3>
            <p className="text-muted-foreground">
              Low = pool × capture low %. High = pool × capture high %.
              Defaults are {captureLow}% and {captureHigh}%.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold">Branch ceiling</h3>
            <p className="text-muted-foreground">
              When a branch has a floor size, ceiling = m² × revenue per m² per
              month (default {formatZarShort(revenuePerSqm)}). Shown potential
              is the lower of the market potential and that ceiling.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold">New sites</h3>
            <p className="text-muted-foreground">
              A candidate must sit at least {defaults.minBranchSeparationKm} km
              from an existing branch. Rank is the pool, lifted by nearby
              clients, and lifted again when the site is farther from a branch.
              Only the top {defaults.topN} are kept.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Ramp</h3>
            <p className="text-muted-foreground">
              Month revenue = potential × that phase’s share of mature
              potential.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1.5 pr-2 font-medium">Phase</th>
                    <th className="py-1.5 pr-2 font-medium">Months</th>
                    <th className="py-1.5 font-medium">Of mature potential</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {MARKET_CAPTURE_PHASES.map((phase) => (
                    <tr key={phase.phase} className="border-b border-dashed">
                      <td className="py-1.5 pr-2">{phase.phase}</td>
                      <td className="py-1.5 pr-2">
                        {phase.monthStart}–{phase.monthEnd - 1}
                      </td>
                      <td className="py-1.5">
                        {Math.round(phase.captureLowPct * 100)}–
                        {Math.round(phase.captureHighPct * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-muted-foreground text-xs">
            This is a modelled ranking only. Visit the site before a lease
            decision. Overlapping circles can count the same store twice, so do
            not add every pool into one total.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
