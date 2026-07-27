import type { VisitListItem } from '@/api/types/visits';
import { parseCoordString } from '@/components/visits-table/visits-table-utils';

/** Check-in / visit action plotted on a sales-rep journey trail. */
export type JourneyVisitAction = {
  id: number;
  latitude: number;
  longitude: number;
  placeName: string;
  contactName?: string;
  duration?: string;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  resolution?: string;
  salesValue?: number | null;
  methodOfContact?: string;
  buildingType?: string;
};

/**
 * Map check-ins with geolocated check-in coords onto journey visit markers.
 */
export function journeyVisitActionsFromCheckIns(
  checkIns: VisitListItem[] | undefined | null
): JourneyVisitAction[] {
  const actions: JourneyVisitAction[] = [];
  for (const c of checkIns ?? []) {
    const coords = parseCoordString(c.checkInLocation);
    if (!coords) continue;
    const [lat, lng] = coords;
    const placeName =
      c.companyName?.trim() ||
      c.client?.name?.trim() ||
      c.contactFullName?.trim() ||
      `Visit #${c.uid}`;

    actions.push({
      id: c.uid,
      latitude: lat,
      longitude: lng,
      placeName,
      contactName: c.contactFullName?.trim() || undefined,
      duration: c.duration?.trim() || undefined,
      checkInTime: c.checkInTime,
      checkOutTime: c.checkOutTime ?? undefined,
      notes: c.notes?.trim() || undefined,
      resolution: c.resolution?.trim() || undefined,
      salesValue: c.salesValue,
      methodOfContact: c.methodOfContact?.trim() || undefined,
      buildingType: c.buildingType?.trim() || undefined,
    });
  }
  return actions;
}

export function formatVisitActionTime(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatVisitSalesValue(
  value: number | null | undefined
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `R${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
