'use client';

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { zAboveLeafletFullscreen } from '@/lib/z-index';
import { DEFAULT_SITE_OPPORTUNITY_SETTINGS } from '@/api/types/site-opportunity';

const DEFAULT_RADIUS_KM =
  DEFAULT_SITE_OPPORTUNITY_SETTINGS.radiusMeters / 1000;
const DEFAULT_TOP_N = DEFAULT_SITE_OPPORTUNITY_SETTINGS.topN;
const DEFAULT_MIN_SEP_KM =
  DEFAULT_SITE_OPPORTUNITY_SETTINGS.minBranchSeparationKm;
const DEFAULT_CAPTURE_LOW = Math.round(
  DEFAULT_SITE_OPPORTUNITY_SETTINGS.captureLowPct * 100
);
const DEFAULT_CAPTURE_HIGH = Math.round(
  DEFAULT_SITE_OPPORTUNITY_SETTINGS.captureHighPct * 100
);

export function SuggestedAreasInfoDialog({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            'h-9 w-9 shrink-0 p-0 text-white [&_svg]:text-white',
            triggerClassName
          )}
          aria-label="How suggested areas work"
          title="How suggested areas work"
        >
          <Info className="size-4 text-white" />
        </Button>
      </DialogTrigger>
      <DialogContent
        overlayClassName={zAboveLeafletFullscreen}
        className={cn(
          zAboveLeafletFullscreen,
          'flex flex-col max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto gap-4'
        )}
      >
        <DialogHeader className="!text-left">
          <DialogTitle>How suggested areas work</DialogTitle>
          <DialogDescription>
            Opportunity circles on the map are ranked site suggestions, not
            guaranteed sales forecasts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="font-medium text-foreground">Before you start</h3>
            <p className="text-muted-foreground">
              Select a country with map markers, then turn on{' '}
              <span className="text-foreground font-medium">Suggested areas</span>
              . The engine needs at least two competitors with coordinates in
              the filtered area to form clusters.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-foreground">New sites</h3>
            <p className="text-muted-foreground">
              Competitors within about 3.5&nbsp;km of each other are grouped into
              clusters (2+ stores). Candidate points are scored inside a{' '}
              {DEFAULT_RADIUS_KM}&nbsp;km radius for addressable pool, nearby
              client demand, and distance from your existing branches. Candidates
              closer than {DEFAULT_MIN_SEP_KM}&nbsp;km to a branch are rejected.
              The top {DEFAULT_TOP_N} zones appear as solid circles with rank
              badges.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-foreground">Branch catchments</h3>
            <p className="text-muted-foreground">
              For each of your branches, competitors and clients inside the same
              radius are counted. Potential capture is estimated at roughly{' '}
              {DEFAULT_CAPTURE_LOW}%–{DEFAULT_CAPTURE_HIGH}% of the brand
              addressable pool (or using ERP revenue gap when available). These
              zones draw as dashed circles.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-foreground">What the pool means</h3>
            <p className="text-muted-foreground">
              Addressable pool uses brand estimate tables (not live competitor
              revenue). Distances are crow-flies, not drive time. Overlapping
              catchments can double-count nationally. Use{' '}
              <span className="text-foreground font-medium">Re-geocode map</span>{' '}
              when coverage is low so more stores sit on the map.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-foreground">Tuning</h3>
            <p className="text-muted-foreground">
              When Suggested areas is on, use the mode buttons (New sites /
              Branch catchments / Both) and the settings control to change
              radius, top zones, branch separation, and capture percentages.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
