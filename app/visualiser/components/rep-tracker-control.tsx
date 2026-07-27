'use client';

import type { BranchListItem } from '@/api/types/branch';
import type {
  RepJourneyEndpoint,
  RepJourneyRange,
  RepJourneySummary,
} from '@/api/types/tracking';
import { Button } from '@/components/ui/button';
import {
  SearchableUserPicker,
  type ReportsFilterUserPickable,
} from '@/components/filters/searchable-filter-comboboxes';
import { cn } from '@/lib/utils';
import {
  formatVisitActionTime,
  type JourneyVisitAction,
} from '@/app/visualiser/lib/journey-visit-actions';
import { formatRelativeRecordedAt } from '@/lib/utils/journey-point-format';

const TRACE_RANGES: { range: RepJourneyRange; label: string }[] = [
  { range: 'hour', label: 'Hour' },
  { range: 'day', label: 'Day' },
  { range: 'week', label: 'Week' },
];

function formatKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return '0 km';
  return `${km.toFixed(1)} km`;
}

function formatSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh <= 0) return '—';
  return `${kmh.toFixed(0)} km/h`;
}

function formatEndpoint(place: RepJourneyEndpoint | null | undefined): string {
  if (!place) return '—';
  if (place.address?.trim()) return place.address.trim();
  return `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
}

function formatEndpointTime(place: RepJourneyEndpoint | null | undefined): string | null {
  if (!place?.recordedAt) return null;
  const d = new Date(place.recordedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type LastKnownLocationSummary = {
  address: string | null;
  recordedAt: string | null;
  batteryLabel?: string | null;
  deviceLabel?: string | null;
  latitude: number;
  longitude: number;
};

export interface RepTrackerControlProps {
  users: ReportsFilterUserPickable[];
  branches: BranchListItem[];
  selectedUid: string;
  onUidChange: (uid: string) => void;
  activeRange: RepJourneyRange | null;
  onTraceRange: (range: RepJourneyRange) => void;
  onClear: () => void;
  isTracing?: boolean;
  statusMessage?: string | null;
  /** Full journey summary when a route is loaded. */
  journeySummary?: RepJourneySummary | null;
  /** Live (or fallback) last-known location for the tracked rep. */
  lastKnownLocation?: LastKnownLocationSummary | null;
  onLastKnownClick?: () => void;
  /** Check-in / visit actions along the tracked trail. */
  visitActions?: JourneyVisitAction[];
  selectedVisitId?: number | null;
  onVisitActionClick?: (visit: JourneyVisitAction) => void;
  className?: string;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  isSearchLoading?: boolean;
}

/**
 * Searchable sales-rep picker + Hour/Day/Week chips for map journey tracking.
 */
export function RepTrackerControl({
  users,
  branches,
  selectedUid,
  onUidChange,
  activeRange,
  onTraceRange,
  onClear,
  isTracing = false,
  statusMessage = null,
  journeySummary = null,
  lastKnownLocation = null,
  onLastKnownClick,
  visitActions = [],
  selectedVisitId = null,
  onVisitActionClick,
  className,
  searchQuery,
  onSearchQueryChange,
  isSearchLoading = false,
}: RepTrackerControlProps) {
  const isTracking = selectedUid !== 'all';
  const showSummary = isTracking && journeySummary != null;

  return (
    <div
      className={cn(
        'bg-background/95 w-full space-y-2 rounded-lg border p-3 shadow-sm backdrop-blur',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
          Track sales rep
        </p>
        {isTracking ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] underline disabled:opacity-50"
            disabled={isTracing}
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}
      </div>
      <SearchableUserPicker
        users={users}
        branches={branches}
        selectedUid={selectedUid}
        onUidChange={onUidChange}
        triggerClassName="h-9 w-full sm:w-full"
        searchPlaceholder="Search sales reps…"
        allOptionLabel="All sales reps"
        emptyMessage="No sales rep found."
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        isSearchLoading={isSearchLoading}
      />
      {isTracking ? (
        <div className="flex flex-wrap gap-1.5">
          {TRACE_RANGES.map(({ range, label }) => (
            <Button
              key={range}
              type="button"
              size="xs"
              variant={activeRange === range ? 'default' : 'outline'}
              disabled={isTracing}
              onClick={() => onTraceRange(range)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}

      {showSummary ? (
        <div className="space-y-2 border-t border-border/50 pt-2">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Trip summary
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            <SummaryCell
              label="Distance"
              value={formatKm(journeySummary.totalDistanceKm)}
            />
            <SummaryCell
              label="Travel time"
              value={journeySummary.totalTravelFormatted || '—'}
            />
            <SummaryCell
              label="Avg drive / day"
              value={formatKm(
                journeySummary.periodAverages.day.averageDistanceKm
              )}
            />
            <SummaryCell
              label="Avg speed"
              value={formatSpeed(journeySummary.averageSpeedKmh)}
            />
            <SummaryCell
              label="Stop time"
              value={journeySummary.totalStopFormatted || '—'}
            />
          </div>

          <div className="space-y-1.5">
            <EndpointRow
              label="Start"
              place={journeySummary.startPlace}
            />
            <EndpointRow
              label="End"
              place={journeySummary.endPlace}
            />
            {lastKnownLocation ? (
              <LastKnownRow
                location={lastKnownLocation}
                onClick={onLastKnownClick}
              />
            ) : null}
          </div>

          {journeySummary.prominentLocations.length > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Common visited places
              </p>
              <ul className="max-h-24 space-y-1 overflow-y-auto">
                {journeySummary.prominentLocations.slice(0, 5).map((loc) => (
                  <li
                    key={`${loc.latitude}-${loc.longitude}-${loc.address}`}
                    className="text-muted-foreground rounded-md border border-border/40 bg-background/40 px-2 py-1 text-[11px] leading-snug"
                  >
                    <span className="text-foreground font-medium tabular-nums">
                      {loc.timeSpentFormatted}
                    </span>
                    {' · '}
                    <span className="break-words">{loc.address}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {visitActions.length > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Visit actions · {visitActions.length}
              </p>
              <ul className="max-h-28 space-y-1 overflow-y-auto">
                {visitActions.map((visit) => {
                  const time = formatVisitActionTime(visit.checkInTime);
                  const isSelected = visit.id === selectedVisitId;
                  return (
                    <li key={visit.id}>
                      <button
                        type="button"
                        className={cn(
                          'w-full rounded-md border px-2 py-1 text-left text-[11px] leading-snug transition-colors',
                          isSelected
                            ? 'border-emerald-600/50 bg-emerald-500/10 text-foreground'
                            : 'border-border/40 bg-background/40 text-muted-foreground hover:border-border hover:bg-muted/40'
                        )}
                        onClick={() => onVisitActionClick?.(visit)}
                      >
                        <span className="text-foreground font-medium break-words">
                          {visit.placeName}
                        </span>
                        <span className="mt-0.5 block tabular-nums">
                          {[time, visit.duration].filter(Boolean).join(' · ') ||
                            'Visit'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <p className="text-muted-foreground text-[10px] tabular-nums">
            {journeySummary.totalPoints} points
            {visitActions.length > 0
              ? ` · ${visitActions.length} visit${visitActions.length === 1 ? '' : 's'}`
              : null}
            {statusMessage ? ` · ${statusMessage}` : null}
          </p>
        </div>
      ) : isTracking && statusMessage ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
      <p className="text-muted-foreground text-[9px] tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground text-[12px] font-semibold tabular-nums leading-tight">
        {value}
      </p>
    </div>
  );
}

function EndpointRow({
  label,
  place,
}: {
  label: string;
  place: RepJourneyEndpoint | null;
}) {
  const time = formatEndpointTime(place);
  return (
    <div className="rounded-md border border-border/40 bg-background/30 px-2 py-1.5">
      <p className="text-muted-foreground text-[9px] tracking-wide uppercase">
        {label}
        {time ? (
          <span className="ml-1 font-normal normal-case tabular-nums">
            · {time}
          </span>
        ) : null}
      </p>
      <p className="text-foreground line-clamp-2 text-[11px] leading-snug break-words">
        {formatEndpoint(place)}
      </p>
    </div>
  );
}

function LastKnownRow({
  location,
  onClick,
}: {
  location: LastKnownLocationSummary;
  onClick?: () => void;
}) {
  const relative = formatRelativeRecordedAt(location.recordedAt);
  const address =
    location.address?.trim() ||
    `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  const deviceLine = [location.batteryLabel, location.deviceLabel]
    .filter((v) => v && v !== '—')
    .join(' · ');

  const body = (
    <>
      <p className="text-muted-foreground text-[9px] tracking-wide uppercase">
        Last known location
        {relative ? (
          <span className="ml-1 font-normal normal-case tabular-nums">
            · {relative}
          </span>
        ) : null}
      </p>
      <p className="text-foreground line-clamp-2 text-[11px] leading-snug break-words">
        {address}
      </p>
      {deviceLine ? (
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">
          {deviceLine}
        </p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="w-full rounded-md border border-violet-500/40 bg-violet-500/5 px-2 py-1.5 text-left transition-colors hover:bg-violet-500/10"
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-violet-500/40 bg-violet-500/5 px-2 py-1.5">
      {body}
    </div>
  );
}
