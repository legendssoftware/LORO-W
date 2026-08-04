import type { VisitListItem } from '@/api/types/visits';
import type { LeadListItem, LeadActivityLogItem } from '@/api/types/leads';
import type {
  DailyProductivityDay,
  VisitPlanScheduleSlot,
} from '@/api/endpoints/user';
import type { ByStatusItem } from '@/api/types/reports';
import {
  formatAddressForDisplay,
  parseCoordString,
} from '@/components/visits-table/visits-table-utils';
import {
  formatMinutesToDuration,
  parseDurationToMinutes,
} from '@/lib/duration';

export type NamedCount = { name: string; value: number };

export type DurationBucket = {
  name: string;
  count: number;
  totalMinutes: number;
};

export type WeeklyTrendPoint = {
  week: string;
  score: number | null;
  callsPct: number | null;
  leadsPct: number | null;
  visitsPct: number | null;
};

type AddressLike = {
  province?: string | null;
  state?: string | null;
  city?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
};

function isAddressLike(v: unknown): v is AddressLike {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function regionFromVisit(visit: VisitListItem): string {
  const contact = isAddressLike(visit.contactAddress) ? visit.contactAddress : null;
  const full = isAddressLike(visit.fullAddress) ? visit.fullAddress : null;
  const checkout = isAddressLike(visit.checkOutFullAddress)
    ? visit.checkOutFullAddress
    : null;
  const branch = visit.branch as { name?: string; alias?: string | null } | null | undefined;
  const province =
    contact?.province ||
    contact?.state ||
    full?.province ||
    full?.state ||
    checkout?.province ||
    checkout?.state ||
    null;
  const city = contact?.city || full?.city || checkout?.city || null;
  if (province && String(province).trim()) return String(province).trim();
  if (city && String(city).trim()) return String(city).trim();
  if (branch?.alias?.trim()) return branch.alias.trim();
  if (branch?.name?.trim()) return branch.name.trim();
  return 'Unknown';
}

function mapToSortedCounts(map: Map<string, number>, topN = 8): NamedCount[] {
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

function durationBucketLabel(minutes: number): string {
  if (minutes <= 0) return 'Unknown';
  if (minutes < 15) return '< 15m';
  if (minutes < 30) return '15–30m';
  if (minutes < 60) return '30–60m';
  if (minutes < 120) return '1–2h';
  return '2h+';
}

/** Aggregate visits by region, contact method (type), and duration buckets. */
export function aggregateVisits(visits: VisitListItem[]): {
  byRegion: NamedCount[];
  byType: NamedCount[];
  byDuration: DurationBucket[];
  total: number;
  totalMinutes: number;
} {
  const regionMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const durationMap = new Map<string, { count: number; totalMinutes: number }>();
  let totalMinutes = 0;

  for (const visit of visits) {
    const region = regionFromVisit(visit);
    regionMap.set(region, (regionMap.get(region) ?? 0) + 1);

    const type =
      typeof visit.methodOfContact === 'string' && visit.methodOfContact.trim()
        ? visit.methodOfContact.trim()
        : 'Unknown';
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);

    const mins = parseDurationToMinutes(visit.duration);
    totalMinutes += mins;
    const bucket = durationBucketLabel(mins);
    const prev = durationMap.get(bucket) ?? { count: 0, totalMinutes: 0 };
    prev.count += 1;
    prev.totalMinutes += mins;
    durationMap.set(bucket, prev);
  }

  const bucketOrder = ['< 15m', '15–30m', '30–60m', '1–2h', '2h+', 'Unknown'];
  const byDuration = bucketOrder
    .filter((name) => durationMap.has(name))
    .map((name) => {
      const row = durationMap.get(name)!;
      return { name, count: row.count, totalMinutes: row.totalMinutes };
    });

  return {
    byRegion: mapToSortedCounts(regionMap),
    byType: mapToSortedCounts(typeMap),
    byDuration,
    total: visits.length,
    totalMinutes,
  };
}

export function formatVisitDurationTotal(totalMinutes: number): string {
  return formatMinutesToDuration(Math.round(totalMinutes));
}

/** Bucket daily productivity into ISO weeks for a trend line. */
export function weeklyTrendFromProductivity(
  days: DailyProductivityDay[]
): WeeklyTrendPoint[] {
  const byWeek = new Map<
    string,
    { scores: number[]; calls: number[]; leads: number[]; visits: number[] }
  >();

  for (const day of days) {
    const d = new Date(`${day.date.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) continue;
    // ISO week key: YYYY-Www
    const week = isoWeekKey(d);
    const bucket = byWeek.get(week) ?? {
      scores: [],
      calls: [],
      leads: [],
      visits: [],
    };
    if (typeof day.score === 'number') bucket.scores.push(day.score);
    if (typeof day.components?.callsPct === 'number') {
      bucket.calls.push(day.components.callsPct);
    }
    if (typeof day.components?.leadsPct === 'number') {
      bucket.leads.push(day.components.leadsPct);
    }
    if (typeof day.components?.visitsPct === 'number') {
      bucket.visits.push(day.components.visitsPct);
    }
    byWeek.set(week, bucket);
  }

  const avg = (vals: number[]): number | null => {
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, bucket]) => ({
      week,
      score: avg(bucket.scores),
      callsPct: avg(bucket.calls),
      leadsPct: avg(bucket.leads),
      visitsPct: avg(bucket.visits),
    }));
}

function isoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Count lead activity actions from list items. */
export function aggregateLeadActions(leads: LeadListItem[]): NamedCount[] {
  const map = new Map<string, number>();
  for (const lead of leads) {
    const rows: LeadActivityLogItem[] = Array.isArray(lead.activity)
      ? lead.activity
      : [];
    if (rows.length === 0) {
      const fallback =
        typeof lead.lastActivityAction === 'string' && lead.lastActivityAction.trim()
          ? lead.lastActivityAction.trim()
          : null;
      if (fallback) {
        map.set(fallback, (map.get(fallback) ?? 0) + 1);
      }
      continue;
    }
    for (const entry of rows) {
      const action =
        typeof entry.action === 'string' && entry.action.trim()
          ? entry.action.trim()
          : 'unknown';
      map.set(action, (map.get(action) ?? 0) + 1);
    }
  }
  return mapToSortedCounts(map, 10).map((row) => ({
    name: humanizeAction(row.name),
    value: row.value,
  }));
}

function humanizeAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function seriesFromByStatus(items: ByStatusItem[] | undefined, topN = 8): NamedCount[] {
  if (!items?.length) return [];
  return [...items]
    .map((i) => ({ name: i.name || 'Unknown', value: i.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/** Rough lead “age / duration in stage” from createdAt → now or last activity. */
export function aggregateLeadDurations(leads: LeadListItem[]): DurationBucket[] {
  const map = new Map<string, { count: number; totalMinutes: number }>();
  const now = Date.now();

  for (const lead of leads) {
    const created = lead.createdAt ? Date.parse(lead.createdAt) : NaN;
    if (!Number.isFinite(created)) continue;
    const endRaw = lead.lastActivityAt ? Date.parse(lead.lastActivityAt) : now;
    const end = Number.isFinite(endRaw) ? endRaw : now;
    const mins = Math.max(0, Math.round((end - created) / 60_000));
    const label = leadDurationBucket(mins);
    const prev = map.get(label) ?? { count: 0, totalMinutes: 0 };
    prev.count += 1;
    prev.totalMinutes += mins;
    map.set(label, prev);
  }

  const order = ['< 1d', '1–3d', '3–7d', '1–2w', '2w+'];
  return order
    .filter((name) => map.has(name))
    .map((name) => {
      const row = map.get(name)!;
      return { name, count: row.count, totalMinutes: row.totalMinutes };
    });
}

function leadDurationBucket(minutes: number): string {
  const days = minutes / (60 * 24);
  if (days < 1) return '< 1d';
  if (days < 3) return '1–3d';
  if (days < 7) return '3–7d';
  if (days < 14) return '1–2w';
  return '2w+';
}

const PHYSICAL_METHOD = 'physical';

/** Physical or missing method = visit; otherwise call (aligned with targets-progress). */
export function isPhysicalCheckIn(checkIn: VisitListItem): boolean {
  const method = checkIn.methodOfContact?.trim().toLowerCase() ?? '';
  return method === '' || method === PHYSICAL_METHOD;
}

export function splitCheckInsByKind(checkIns: VisitListItem[]): {
  calls: VisitListItem[];
  visits: VisitListItem[];
} {
  const calls: VisitListItem[] = [];
  const visits: VisitListItem[] = [];
  for (const checkIn of checkIns) {
    if (isPhysicalCheckIn(checkIn)) visits.push(checkIn);
    else calls.push(checkIn);
  }
  return { calls, visits };
}

function ymdToRangeMs(fromYmd: string, toYmd: string): { start: number; end: number } {
  const start = new Date(`${fromYmd.slice(0, 10)}T00:00:00`).getTime();
  const end = new Date(`${toYmd.slice(0, 10)}T23:59:59.999`).getTime();
  return { start, end };
}

/** Filter lead activity log entries whose timestamp falls within [from, to] (inclusive). */
export function filterActivityEntriesInRange(
  lead: LeadListItem,
  fromYmd: string,
  toYmd: string
): LeadActivityLogItem[] {
  const { start, end } = ymdToRangeMs(fromYmd, toYmd);
  const rows = Array.isArray(lead.activity) ? lead.activity : [];
  return rows.filter((entry) => {
    const t = Date.parse(entry.at);
    return Number.isFinite(t) && t >= start && t <= end;
  });
}

export function filterVisitPlanSlotsInRange(
  slots: VisitPlanScheduleSlot[] | undefined,
  fromYmd: string,
  toYmd: string
): VisitPlanScheduleSlot[] {
  if (!slots?.length) return [];
  const from = fromYmd.slice(0, 10);
  const to = toYmd.slice(0, 10);
  return slots.filter((slot) => {
    const d = slot.visitDate?.slice(0, 10);
    if (!d) return false;
    return d >= from && d <= to;
  });
}

export function countPlannedVisitsInSlots(slots: VisitPlanScheduleSlot[]): number {
  return slots.reduce((sum, slot) => sum + (slot.tasks?.length ?? 0), 0);
}

export type ActivityDetailRow = {
  id: number;
  kind: 'call' | 'visit';
  methodOfContact: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number;
  durationLabel: string;
  contactLabel: string;
  outcome: string | null;
  locationLabel: string;
  locationHref: string | null;
  followUp: string | null;
  contactMade: string | null;
};

function locationFromCheckIn(checkIn: VisitListItem): {
  label: string;
  href: string | null;
} {
  const full = checkIn.fullAddress;
  const contact = checkIn.contactAddress;
  const checkout = checkIn.checkOutFullAddress;
  const formatted =
    full?.formattedAddress?.trim() ||
    contact?.formattedAddress?.trim() ||
    checkout?.formattedAddress?.trim() ||
    null;
  if (formatted) return { label: formatted, href: null };

  const addressParts = formatAddressForDisplay(
    contact ?? full ?? checkout,
    undefined
  );
  if (addressParts && addressParts !== '-') {
    return { label: addressParts, href: null };
  }

  const coords = parseCoordString(checkIn.checkInLocation);
  if (coords) {
    const label = `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
    return {
      label,
      href: `https://www.google.com/maps?q=${encodeURIComponent(label)}`,
    };
  }

  return { label: '—', href: null };
}

function contactLabelFromCheckIn(checkIn: VisitListItem): string {
  return (
    checkIn.contactFullName?.trim() ||
    checkIn.companyName?.trim() ||
    checkIn.client?.name?.trim() ||
    `Activity #${checkIn.uid}`
  );
}

function outcomeFromCheckIn(checkIn: VisitListItem): string | null {
  const resolution = checkIn.resolution?.trim();
  if (resolution) return resolution;
  if (checkIn.contactMade === true || checkIn.contactMade === 'YES') {
    return 'Contact made';
  }
  if (checkIn.contactMade === false || checkIn.contactMade === 'NO') {
    return 'No contact';
  }
  return null;
}

function contactMadeLabel(checkIn: VisitListItem): string | null {
  if (checkIn.contactMade === true || checkIn.contactMade === 'YES') return 'Yes';
  if (checkIn.contactMade === false || checkIn.contactMade === 'NO') return 'No';
  return null;
}

/** Build sorted activity rows (newest check-in first) for the detail table. */
export function buildActivityDetailRows(checkIns: VisitListItem[]): ActivityDetailRow[] {
  const sorted = [...checkIns].sort(
    (a, b) => Date.parse(b.checkInTime) - Date.parse(a.checkInTime)
  );

  return sorted.map((checkIn) => {
    const kind = isPhysicalCheckIn(checkIn) ? 'visit' : 'call';
    const durationMinutes = parseDurationToMinutes(checkIn.duration);
    const location = locationFromCheckIn(checkIn);
    const method =
      typeof checkIn.methodOfContact === 'string' && checkIn.methodOfContact.trim()
        ? checkIn.methodOfContact.trim()
        : kind === 'visit'
          ? 'Physical'
          : 'Unknown';

    return {
      id: checkIn.uid,
      kind,
      methodOfContact: method,
      checkInTime: checkIn.checkInTime,
      checkOutTime: checkIn.checkOutTime ?? null,
      durationMinutes,
      durationLabel:
        durationMinutes > 0 ? formatMinutesToDuration(durationMinutes) : '—',
      contactLabel: contactLabelFromCheckIn(checkIn),
      outcome: outcomeFromCheckIn(checkIn),
      locationLabel: location.label,
      locationHref: location.href,
      followUp: checkIn.followUp?.trim() || null,
      contactMade: contactMadeLabel(checkIn),
    };
  });
}

export type ActivitySummary = {
  callCount: number;
  callTotalMinutes: number;
  visitCount: number;
  visitTotalMinutes: number;
  plannedVisitCount: number;
  avgDurationMinutes: number;
  byOutcome: NamedCount[];
  byLocation: NamedCount[];
};

export function aggregateActivitySummary(
  checkIns: VisitListItem[],
  planSlotsInRange: VisitPlanScheduleSlot[]
): ActivitySummary {
  const { calls, visits } = splitCheckInsByKind(checkIns);
  let callTotalMinutes = 0;
  let visitTotalMinutes = 0;
  let totalMinutes = 0;
  let durationCount = 0;

  for (const checkIn of checkIns) {
    const mins = parseDurationToMinutes(checkIn.duration);
    if (mins > 0) {
      totalMinutes += mins;
      durationCount += 1;
    }
  }

  for (const checkIn of calls) {
    callTotalMinutes += parseDurationToMinutes(checkIn.duration);
  }
  for (const checkIn of visits) {
    visitTotalMinutes += parseDurationToMinutes(checkIn.duration);
  }

  const outcomeMap = new Map<string, number>();
  for (const checkIn of checkIns) {
    const outcome = outcomeFromCheckIn(checkIn) ?? 'No outcome';
    outcomeMap.set(outcome, (outcomeMap.get(outcome) ?? 0) + 1);
  }

  const locationMap = new Map<string, number>();
  for (const checkIn of checkIns) {
    const region = regionFromVisit(checkIn);
    locationMap.set(region, (locationMap.get(region) ?? 0) + 1);
  }

  return {
    callCount: calls.length,
    callTotalMinutes,
    visitCount: visits.length,
    visitTotalMinutes,
    plannedVisitCount: countPlannedVisitsInSlots(planSlotsInRange),
    avgDurationMinutes:
      durationCount > 0 ? Math.round(totalMinutes / durationCount) : 0,
    byOutcome: mapToSortedCounts(outcomeMap, 8),
    byLocation: mapToSortedCounts(locationMap, 5),
  };
}
