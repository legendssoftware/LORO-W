'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MARKET_CAPTURE_PHASES } from '@/lib/site-opportunity/compute/capture-phases';
import { HARDWARE_TURNOVER_ZAR } from '@/lib/site-opportunity/compute/brands';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';

interface MapSimulationInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Explains BitDrywall feasibility / turnover simulation methodology.
 */
export function MapSimulationInfoModal({
  open,
  onOpenChange,
}: MapSimulationInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>How simulation works</DialogTitle>
          <DialogDescription>
            Feasibility model for BitDrywall branch catchments and opportunity
            sites — ranking upside and ramp time, not a guaranteed forecast.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 text-sm leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-semibold">What it does</h3>
            <p className="text-muted-foreground">
              Simulation uses your mapped BitDrywall branches, competitor
              hardwares (BUCO, Cashbuild, Build it, Powerbuild, EST, …), and
              clients. For each branch it draws a 5 km radius, counts hardwares
              inside, multiplies by brand monthly turnover to get an addressable
              pool, then takes 5% (low) and 20% (high) as BitDrywall potential.
              ERP monthly store sales (when available) show actual vs modelled
              monthly turnover — red when behind the model, green when at or
              above. Adjust radius, capture %, and brand turnovers in the side
              panel before you run.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Brand turnover assumptions (monthly)</h3>
            <ul className="text-muted-foreground grid gap-1 sm:grid-cols-2">
              {Object.entries(HARDWARE_TURNOVER_ZAR)
                .filter(([b]) => b !== 'OTHER' && b !== 'P&L HARDWARE')
                .map(([brand, zar]) => (
                  <li key={brand} className="flex justify-between gap-2 border-b border-dashed py-1">
                    <span>{brand}</span>
                    <span className="text-foreground font-medium">
                      {formatZarShort(zar)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Maturity curve (~24 months)</h3>
            <p className="text-muted-foreground">
              Contractors rarely switch overnight. The ramp below is progress
              toward your mature potential band (pool × 5–20%). Exceptional
              sites may mature by 18 months; tougher markets 30–36.
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
                  {MARKET_CAPTURE_PHASES.map((p) => (
                    <tr key={p.phase} className="border-b border-dashed">
                      <td className="py-1.5 pr-2">{p.phase}</td>
                      <td className="py-1.5 pr-2">
                        {p.monthStart}–{p.monthEnd - 1}
                      </td>
                      <td className="py-1.5">
                        {Math.round(p.captureLowPct * 100)}–
                        {Math.round(p.captureHighPct * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs">
              Year targets (of local market): Year 1 ≈ 8%, Year 2 ≈ 13%, Year 3 ≈
              15% (up to 20% in exceptional locations).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Steps</h3>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
              <li>
                Open <span className="text-foreground font-medium">Simulate</span>{' '}
                to open the side panel. Pick country and province (and
                catchments / opportunities / both), review or adjust defaults,
                then start a run. Toast progress shows while catchments are
                scored.
              </li>
              <li>
                Review ranked branch catchments and opportunity zones. Expand a
                row for pool, brand mix, potential band, and maturity ramp.
              </li>
              <li>
                5 km circles appear on the map. Click a circle to focus that
                zone. Clear overlay when done — live map data is never written.
              </li>
              <li>
                Sales-rep GPS stays read-only and is never relocated by
                simulation.
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Caveats</h3>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li>
                This is a simulation only. Outputs are modelled estimates for
                ranking and planning — not guaranteed revenue, site fitness, or
                investment advice.
              </li>
              <li>
                Do not rely on simulation alone. Visit candidate sites in
                person, verify footfall, access, neighbours, and competition,
                and complete independent due diligence before lease or capital
                decisions. LORO is not liable for losses from acting solely on
                these results.
              </li>
              <li>
                Circles use crow-flies distance, not drive time.
              </li>
              <li>
                Overlapping catchments can double-count the same hardware —
                compare sites; do not sum all pools into a national total.
              </li>
              <li>
                Brand turnovers are planning assumptions, not audited competitor
                financials.
              </li>
              <li>
                Import and geocode competitors before trusting pool totals.
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
