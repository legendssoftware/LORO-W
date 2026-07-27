'use client';

import {
  CheckCircle2,
  Clock,
  MapPin,
  NotebookPen,
  User,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  MapMarker,
  MapPopup,
  MarkerContent,
  MarkerLabel,
} from '@/components/ui/map';
import {
  formatVisitActionTime,
  formatVisitSalesValue,
  type JourneyVisitAction,
} from '@/app/visualiser/lib/journey-visit-actions';

type JourneyVisitsLayerProps = {
  visits: JourneyVisitAction[];
  selectedVisitId: number | null;
  onVisitClick: (visit: JourneyVisitAction) => void;
  onVisitClose: () => void;
};

function PopupRow({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p className="text-muted-foreground flex items-start gap-1.5 font-sans text-xs">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

/**
 * Visit / check-in markers overlaid on a tracked sales-rep journey.
 */
export function JourneyVisitsLayer({
  visits,
  selectedVisitId,
  onVisitClick,
  onVisitClose,
}: JourneyVisitsLayerProps) {
  const selected = visits.find((v) => v.id === selectedVisitId) ?? null;

  return (
    <>
      {visits.map((visit) => {
        const isSelected = visit.id === selectedVisitId;
        return (
          <MapMarker
            key={`journey-visit-${visit.id}`}
            longitude={visit.longitude}
            latitude={visit.latitude}
            onClick={(e) => {
              e.stopPropagation();
              onVisitClick(visit);
            }}
          >
            <MarkerContent>
              <button
                type="button"
                className="relative flex size-7 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                aria-label={`Visit: ${visit.placeName}`}
                aria-pressed={isSelected}
              >
                <CheckCircle2 className="size-3.5 text-white" />
              </button>
              <MarkerLabel position="bottom">
                <span className="max-w-28 truncate text-[10px] font-medium text-emerald-900">
                  {visit.placeName}
                </span>
              </MarkerLabel>
            </MarkerContent>
          </MapMarker>
        );
      })}

      {selected ? (
        <MapPopup
          key={`journey-visit-popup-${selected.id}`}
          longitude={selected.longitude}
          latitude={selected.latitude}
          offset={22}
          closeButton
          closeOnClick={false}
          focusAfterOpen={false}
          onClose={onVisitClose}
          className="min-w-52 border-border/50 bg-background/75 font-sans shadow-none backdrop-blur-md"
        >
          <JourneyVisitPopupContent visit={selected} />
        </MapPopup>
      ) : null}
    </>
  );
}

function JourneyVisitPopupContent({ visit }: { visit: JourneyVisitAction }) {
  const checkInLabel = formatVisitActionTime(visit.checkInTime);
  const checkOutLabel = formatVisitActionTime(visit.checkOutTime);
  const salesLabel = formatVisitSalesValue(visit.salesValue);
  const timeRange = [checkInLabel, checkOutLabel].filter(Boolean).join(' → ');

  const highlights: { label: string; value: string }[] = [];
  if (visit.duration) highlights.push({ label: 'Duration', value: visit.duration });
  if (salesLabel) highlights.push({ label: 'Sales', value: salesLabel });
  if (visit.methodOfContact) {
    highlights.push({ label: 'Contact', value: visit.methodOfContact });
  }
  if (visit.buildingType) {
    highlights.push({ label: 'Site', value: visit.buildingType });
  }

  return (
    <div className="min-w-48 max-w-72 space-y-2 pr-1 font-sans">
      <div>
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Visit action
        </p>
        <h3 className="text-foreground leading-snug font-semibold">
          {visit.placeName}
        </h3>
      </div>

      <div className="space-y-1.5">
        <PopupRow icon={<MapPin className="size-3.5" />}>
          {`${visit.latitude.toFixed(5)}, ${visit.longitude.toFixed(5)}`}
        </PopupRow>
        <PopupRow icon={<User className="size-3.5" />}>
          {visit.contactName}
        </PopupRow>
        <PopupRow icon={<Clock className="size-3.5" />}>
          {timeRange || null}
        </PopupRow>
        {visit.notes ? (
          <PopupRow icon={<NotebookPen className="size-3.5" />}>
            {visit.notes.length > 140
              ? `${visit.notes.slice(0, 137)}…`
              : visit.notes}
          </PopupRow>
        ) : null}
        {visit.resolution ? (
          <PopupRow icon={<CheckCircle2 className="size-3.5" />}>
            {visit.resolution}
          </PopupRow>
        ) : null}
      </div>

      {highlights.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {highlights.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5"
            >
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {item.label}
              </p>
              <p className="text-foreground text-sm font-semibold tabular-nums break-words">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
