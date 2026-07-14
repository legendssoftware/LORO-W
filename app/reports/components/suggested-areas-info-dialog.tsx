'use client';

import type { ReactNode } from 'react';
import {
  Calculator,
  CircleDashed,
  ClipboardList,
  Globe2,
  Info,
  MapPinned,
  RefreshCw,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from 'lucide-react';
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

const DIALOG_WIDTH_CLASS =
  'w-[min(80vw,calc(100%-2rem))] max-w-[80vw] sm:max-w-[80vw]';

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

function InfoSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3 sm:p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
        <h3 className="font-medium text-foreground">{title}</h3>
      </div>
      <div className="text-muted-foreground space-y-2 pl-0 sm:pl-[2.625rem]">
        {children}
      </div>
    </section>
  );
}

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
          DIALOG_WIDTH_CLASS,
          'flex flex-col max-h-[85vh] overflow-y-auto gap-4'
        )}
      >
        <DialogHeader className="!text-left">
          <DialogTitle>How suggested areas work</DialogTitle>
          <DialogDescription>
            Opportunity circles on the map are ranked site suggestions for store
            planning—not guaranteed sales forecasts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-foreground leading-relaxed">
          <InfoSection icon={ClipboardList} title="How to use this (toolbar)">
            <ul className="list-disc space-y-1.5 pl-4">
              <li>
                <span className="text-foreground font-medium">Country / province</span>
                {' '}
                filters (globe and pin) narrow which markers feed the map and
                suggestions.
              </li>
              <li>
                <span className="text-foreground font-medium">Suggested areas</span>
                {' '}
                turns on ranked opportunity circles for the filtered view.
              </li>
              <li>
                <span className="text-foreground font-medium">Re-geocode map</span>
                {' '}
                places more stores on the map when addresses lack coordinates.
              </li>
              <li>
                <span className="text-foreground font-medium">Summary</span>
                {' '}
                opens counts, brand mix, and province charts for the current filters.
              </li>
              <li>
                <span className="text-foreground font-medium">This info button</span>
                {' '}
                (green) explains the suggestions and how numbers are estimated.
              </li>
            </ul>
          </InfoSection>

          <InfoSection icon={MapPinned} title="Before you start">
            <p>
              Pick a country that has map markers, optionally narrow by province,
              then turn on{' '}
              <span className="text-foreground font-medium">Suggested areas</span>
              . You need at least two competitors with valid coordinates in the
              filtered area so clusters can form.
            </p>
          </InfoSection>

          <InfoSection icon={Target} title="New sites — plain English">
            <p>
              Think of it as finding “busy rival neighbourhoods” that are not
              already covered by your own branches:
            </p>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                Competitors within about 3.5&nbsp;km of each other are grouped into
                clusters (two or more stores).
              </li>
              <li>
                Each candidate spot is scored inside a {DEFAULT_RADIUS_KM}&nbsp;km
                circle: how much addressable trade is nearby, how many clients are
                close, and how far it is from your existing branches.
              </li>
              <li>
                Spots closer than {DEFAULT_MIN_SEP_KM}&nbsp;km to one of your
                branches are skipped so you are not overlapping yourself.
              </li>
              <li>
                The best {DEFAULT_TOP_N} zones draw as solid circles with rank
                badges on the map.
              </li>
            </ol>
          </InfoSection>

          <InfoSection icon={CircleDashed} title="Branch catchments">
            <p>
              For each of your branches, we look at competitors and clients inside
              the same search radius. That is the “coverage footprint” of the
              branch.
            </p>
            <p>
              Potential capture is estimated at roughly{' '}
              {DEFAULT_CAPTURE_LOW}%–{DEFAULT_CAPTURE_HIGH}% of the brand
              addressable pool (or from an ERP revenue gap when that data exists).
              These zones draw as dashed circles so you can tell them apart from
              new-site suggestions.
            </p>
          </InfoSection>

          <InfoSection icon={Calculator} title="How the pool is calculated">
            <p>
              Addressable pool is a planning estimate, not live till data from
              competitors. Each hardware brand has a typical monthly turnover
              figure; stores in a zone add up to a rough “pool” of trade nearby.
            </p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>
                Distances are straight-line (crow-flies), not drive time or
                traffic.
              </li>
              <li>
                Overlapping circles can count the same store more than once when
                you look nationally—use overlapping zones carefully.
              </li>
              <li>
                If many pins are missing, use{' '}
                <span className="text-foreground font-medium">Re-geocode map</span>{' '}
                so more stores sit on the map and pools are more complete.
              </li>
            </ul>
          </InfoSection>

          <InfoSection icon={SlidersHorizontal} title="Tuning">
            <p>
              When Suggested areas is on, use the mode buttons (
              <span className="text-foreground font-medium">New sites</span> /{' '}
              <span className="text-foreground font-medium">Branch catchments</span>{' '}
              /{' '}
              <span className="text-foreground font-medium">Both</span>
              ) and the settings control to change radius, how many top zones to
              show, minimum distance from your branches, and capture percentages.
            </p>
          </InfoSection>

          <div className="rounded-lg border border-dashed border-border/80 px-3 py-2.5 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="size-3.5" aria-hidden />
              Filters first
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="size-3.5" aria-hidden />
              Re-geocode when coverage is low
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5" aria-hidden />
              Suggestions guide planning, not forecasts
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
