'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_SITE_OPPORTUNITY_SETTINGS } from '@/api/types/site-opportunity';
import { MARKET_CAPTURE_PHASES } from '@/lib/site-opportunity/compute/capture-phases';
import { HARDWARE_TURNOVER_ZAR } from '@/lib/site-opportunity/compute/brands';

interface MapSimulationInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRand(value: number): string {
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="bg-muted/60 rounded-md px-2.5 py-1.5 font-mono text-xs leading-relaxed">
      {children}
    </p>
  );
}

/**
 * Walk through the catchment formulas with one worked example from the live defaults.
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
  const repTarget = defaults.repTargetMonthlyZAR ?? 1_000_000;
  const maturePhase = MARKET_CAPTURE_PHASES.find(
    (phase) => phase.phase === 'Mature',
  );
  const matureMidPct = maturePhase?.captureMidPct ?? 0.93;

  const bucoStores = 4;
  const cashbuildStores = 2;
  const bucoRate = HARDWARE_TURNOVER_ZAR.BUCO;
  const cashbuildRate = HARDWARE_TURNOVER_ZAR.CASHBUILD;
  const examplePool = bucoStores * bucoRate + cashbuildStores * cashbuildRate;
  const potentialLow = examplePool * defaults.captureLowPct;
  const potentialHigh = examplePool * defaults.captureHighPct;
  const potentialMid = (potentialLow + potentialHigh) / 2;
  const matureMid = potentialMid * matureMidPct;
  const exampleFloorSqm = 400;
  const exampleCeiling = exampleFloorSqm * revenuePerSqm;
  const cappedHigh = Math.min(potentialHigh, exampleCeiling);
  const exampleReps = Math.ceil(matureMid / repTarget);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>How the simulation is calculated</DialogTitle>
          <DialogDescription>
            Each result is a straight-line circle around a branch or a new
            site. The steps below are the order the model uses. Percentages
            and rates are the current defaults; change them in Simulate and
            the same formulas run again.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 text-sm leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="font-semibold">1. What goes into a circle</h3>
            <p className="text-muted-foreground">
              The radius is {radiusKm} km by default, measured as the crow
              flies from the centre. A competitor or client counts only when
              it has map coordinates inside that circle. Stores without
              coordinates are left out.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold">2. Addressable pool</h3>
            <p className="text-muted-foreground">
              Every competitor brand has a monthly turnover per store. The
              pool is the sum of those stores.
            </p>
            <Formula>
              Pool = Σ (stores of a brand in the circle × that brand’s monthly
              turnover)
            </Formula>
            <p className="text-muted-foreground">
              Worked example with the default rates: {bucoStores} BUCO stores
              at {formatRand(bucoRate)} and {cashbuildStores} Cashbuild stores
              at {formatRand(cashbuildRate)}. The rest of this page continues
              from this same pool.
            </p>
            <Formula>
              Pool = ({bucoStores} × {formatRand(bucoRate)}) + (
              {cashbuildStores} × {formatRand(cashbuildRate)}) ={' '}
              {formatRand(examplePool)} / month
            </Formula>
            <p className="text-muted-foreground">
              Editing a brand rate in Simulate replaces the default for every
              store of that brand. Clients are counted in the circle. Only
              competitor turnover adds rand to the pool.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold">3. BitDrywall potential</h3>
            <p className="text-muted-foreground">
              Potential is the share of that pool BitDrywall could take.
              Defaults are {captureLow}% and {captureHigh}%.
            </p>
            <Formula>
              Low = pool × {captureLow}% = {formatRand(potentialLow)}
            </Formula>
            <Formula>
              High = pool × {captureHigh}% = {formatRand(potentialHigh)}
            </Formula>
            <Formula>
              Mid = (low + high) / 2 = {formatRand(potentialMid)}
            </Formula>
            <p className="text-muted-foreground">
              Capture percentages come from Simulate. The competition label
              (weak, normal, highly competitive) names how many hardware
              stores sit in the circle.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold">4. Branch floor ceiling</h3>
            <p className="text-muted-foreground">
              On an existing branch, floor size can cap the potential. New
              sites have no floor cap.
            </p>
            <Formula>
              Ceiling = floor m² × {formatRand(revenuePerSqm)} per m² per month
            </Formula>
            <Formula>
              Shown low = the lower of market low and the ceiling
            </Formula>
            <Formula>
              Shown high = the lower of market high and the ceiling
            </Formula>
            <p className="text-muted-foreground">
              Example: {exampleFloorSqm} m² × {formatRand(revenuePerSqm)} ={' '}
              {formatRand(exampleCeiling)} / month. The example high of{' '}
              {formatRand(potentialHigh)} would show as {formatRand(cappedHigh)}{' '}
              because the ceiling is lower. A branch with no floor size keeps
              the uncapped market potential.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Ramp to a monthly figure</h3>
            <p className="text-muted-foreground">
              The timeline steps every 3 months. Each phase percentage
              multiplies the potential from step 3. When a floor ceiling
              applies, the same percentages multiply the capped low and high
              instead. The numbers below stay on the uncapped example. A
              Mature mid of {Math.round(matureMidPct * 100)}% means{' '}
              {Math.round(matureMidPct * 100)}% of the mid potential.
            </p>
            <Formula>
              Month low = potential low × phase low %
            </Formula>
            <Formula>
              Month mid = potential mid × phase mid %
            </Formula>
            <Formula>
              Month high = potential high × phase high %
            </Formula>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1.5 pr-2 font-medium">Phase</th>
                    <th className="py-1.5 pr-2 font-medium">Months</th>
                    <th className="py-1.5 font-medium">Share of potential</th>
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
                        {Math.round(phase.captureHighPct * 100)}% (mid{' '}
                        {Math.round(phase.captureMidPct * 100)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">
              The headline “Mature mid” is month 24, inside the Mature phase.
              That phase’s mid share is {Math.round(matureMidPct * 100)}%.
            </p>
            <Formula>
              Mature mid = {formatRand(potentialMid)} ×{' '}
              {Math.round(matureMidPct * 100)}% = {formatRand(matureMid)} /
              month
            </Formula>
            <p className="text-muted-foreground">
              “Months to mature” is the first 3-month step where mid revenue
              reaches {Math.round(matureMidPct * 100)}% of mid potential.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold">6. ERP and reps</h3>
            <p className="text-muted-foreground">
              ERP actual is the branch’s latest monthly sales. It sits beside
              the model so you can see the gap. The pool stays the competitor
              sum from step 2.
            </p>
            <Formula>Variance = ERP actual − mature mid</Formula>
            <p className="text-muted-foreground">
              Reps needed rounds the mature mid up to whole people at the rep
              target ({formatRand(repTarget)} / month).
            </p>
            <Formula>
              Reps = ceiling({formatRand(matureMid)} / {formatRand(repTarget)})
              = {exampleReps}
            </Formula>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold">7. New sites</h3>
            <p className="text-muted-foreground">
              Competitors within 3.5 km of each other form a cluster. A cluster
              needs at least two stores. The model tries points inside that
              cluster and keeps the best one.
            </p>
            <p className="text-muted-foreground">
              A point closer than {defaults.minBranchSeparationKm} km to an
              existing branch is dropped. The rest are scored, and only the
              top {defaults.topN} are shown.
            </p>
            <Formula>Score = pool × client lift × distance lift</Formula>
            <p className="text-muted-foreground">
              Client lift runs from 1.00 to 1.35. Hardware clients weigh 1.5,
              contractors 1.2, and other clients 1. Distance lift is 1.00 when
              the site is exactly {defaults.minBranchSeparationKm} km from the
              nearest branch, and it rises to about 1.18 once the gap is 1.5
              times that distance. The pool in this score is the same sum as
              step 2.
            </p>
          </section>

          <p className="text-muted-foreground text-xs">
            This ranks sites. It is a modelled estimate of the rates and
            capture band you set for the run. Visit a site before a lease
            decision. Overlapping circles can count the same store twice, so
            do not add every pool into one national total.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
